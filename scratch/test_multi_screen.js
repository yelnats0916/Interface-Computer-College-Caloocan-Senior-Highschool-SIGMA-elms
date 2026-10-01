const { spawn } = require('child_process');
const fs = require('fs');

async function testScreens() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9227',
        '--window-size=1200,900',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9227/json/version');
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

        const { targetId } = await send('Target.createTarget', { url: 'http://127.0.0.1:5519/student.html' });
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

        const viewports = [320, 375, 390, 430, 540, 768, 820, 960];

        for (const w of viewports) {
            await sendSession('Emulation.setDeviceMetricsOverride', {
                width: w,
                height: 900,
                deviceScaleFactor: 2,
                mobile: true
            });
            await new Promise(r => setTimeout(r, 800));

            const result = await sendSession('Runtime.evaluate', {
                expression: `(() => {
                    const welcome = document.querySelector('.welcome-panel');
                    const tabs = document.querySelector('.sigma-feed-tabs-container');
                    const body = document.body;
                    const docEl = document.documentElement;

                    const wRect = welcome?.getBoundingClientRect();
                    const tRect = tabs?.getBoundingClientRect();

                    return JSON.stringify({
                        viewportWidth: window.innerWidth,
                        hasHorizontalOverflow: docEl.scrollWidth > window.innerWidth,
                        docScrollWidth: docEl.scrollWidth,
                        welcome: wRect ? { left: wRect.left, right: wRect.right, width: wRect.width, height: wRect.height } : null,
                        tabs: tRect ? { left: tRect.left, right: tRect.right, width: tRect.width, height: tRect.height } : null
                    });
                })()`
            });

            console.log('Screen ' + w + 'px:', JSON.parse(result.result.value));
        }

        ws.close();
    } finally {
        chrome.kill();
    }
}

testScreens().catch(console.error);
