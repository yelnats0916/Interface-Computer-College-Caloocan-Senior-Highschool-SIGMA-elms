const { spawn } = require('child_process');
const fs = require('fs');

async function testProgressBar() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9229',
        '--window-size=390,844',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9229/json/version');
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
        await sendSession('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true
        });

        await new Promise(r => setTimeout(r, 2000));

        // Start loading
        await sendSession('Runtime.evaluate', {
            expression: `(() => { window.showTopNavLoading(); })()`
        });

        await new Promise(r => setTimeout(r, 500));

        // Finish loading
        await sendSession('Runtime.evaluate', {
            expression: `(() => { window.hideTopNavLoading(); })()`
        });

        await new Promise(r => setTimeout(r, 80));

        const stateFull = await sendSession('Runtime.evaluate', {
            expression: `(() => {
                const bar = document.getElementById('top-nav-loading-bar');
                const fill = bar?.querySelector('.top-nav-loading-bar__fill');
                return JSON.stringify({
                    fillWidth: fill?.style.width,
                    isFinishing: bar?.classList.contains('finishing')
                });
            })()`
        });
        console.log('Finished 100% Full Line:', JSON.parse(stateFull.result.value));

        const shotFull = await sendSession('Page.captureScreenshot', {
            clip: { x: 0, y: 0, width: 390, height: 120, scale: 2 }
        });
        fs.writeFileSync('C:\\Users\\stanl\\.gemini\\antigravity\\brain\\75a5d647-ef0c-42e1-8707-1b6ec8cab770\\topbar_progress_100.png', Buffer.from(shotFull.data, 'base64'));
        console.log('Saved topbar_progress_100.png');

        ws.close();
    } finally {
        chrome.kill();
    }
}

testProgressBar().catch(console.error);
