const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\stanl\\.gemini\\antigravity\\brain\\75a5d647-ef0c-42e1-8707-1b6ec8cab770';

async function inspectTabs() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9230',
        '--window-size=1280,900',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9230/json/version');
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

        const testUrls = [
            { name: 'student', url: 'http://127.0.0.1:5519/student.html' },
            { name: 'teacher', url: 'http://127.0.0.1:5519/teacher.html' }
        ];

        const testViewports = [
            { name: 'desktop', width: 1280, height: 900, mobile: false },
            { name: 'mobile', width: 390, height: 844, mobile: true }
        ];

        for (const target of testUrls) {
            console.log(`\n=== Testing ${target.name} (${target.url}) ===`);
            const { targetId } = await send('Target.createTarget', { url: target.url });
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

            for (const vp of testViewports) {
                await sendSession('Emulation.setDeviceMetricsOverride', {
                    width: vp.width,
                    height: vp.height,
                    deviceScaleFactor: 2,
                    mobile: vp.mobile
                });

                await new Promise(r => setTimeout(r, 1200));

                const result = await sendSession('Runtime.evaluate', {
                    expression: `(() => {
                        const tabs = document.querySelector('.sigma-feed-tabs-container');
                        const btns = Array.from(document.querySelectorAll('.sigma-feed-tab-btn, #section-home .main-dashboard-column>div:nth-child(2) button, #section-dashboard .main-dashboard-column>div:nth-child(3) button'));
                        const uniqueBtns = Array.from(new Set(btns));
                        return {
                            containerWidth: tabs ? tabs.getBoundingClientRect().width : null,
                            buttons: uniqueBtns.map(b => {
                                const cs = window.getComputedStyle(b);
                                const rect = b.getBoundingClientRect();
                                return {
                                    text: b.innerText.trim(),
                                    width: Math.round(rect.width * 10) / 10,
                                    color: cs.color,
                                    backgroundColor: cs.backgroundColor,
                                    fontSize: cs.fontSize,
                                    fontWeight: cs.fontWeight
                                };
                            })
                        };
                    })()`,
                    returnByValue: true
                });

                const data = result && result.result ? result.result.value : null;
                console.log(`${vp.name} (${vp.width}px):`, JSON.stringify(data, null, 2));

                // Take screenshot
                const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
                if (shot && shot.data) {
                    const fileName = `${target.name}_blacktext_${vp.name}.png`;
                    fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), Buffer.from(shot.data, 'base64'));
                    console.log(`Saved screenshot: ${fileName}`);
                }
            }

            await send('Target.closeTarget', { targetId });
        }

        ws.close();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        chrome.kill();
    }
}

inspectTabs();
