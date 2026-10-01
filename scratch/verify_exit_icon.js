const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\stanl\\.gemini\\antigravity\\brain\\75a5d647-ef0c-42e1-8707-1b6ec8cab770';

async function run() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9250',
        '--window-size=1280,800',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9250/json/version');
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
        await new Promise(r => setTimeout(r, 2000));

        // Inject multi-image post
        await sendSession('Runtime.evaluate', {
            expression: `(() => {
                function makeImg(w, h, color, text) {
                    const canvas = document.createElement("canvas");
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 24px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(text, w/2, h/2);
                    return canvas.toDataURL("image/png");
                }

                const post = {
                    id: "test_nav_post",
                    authorName: "Jacqueline Artates",
                    authorRole: "General Manager",
                    timestamp: "Just now",
                    content: "Test announcement",
                    mediaType: "image",
                    mediaUrls: [makeImg(800, 500, "#2563eb", "Photo 1"), makeImg(800, 500, "#10b981", "Photo 2")],
                    likes: 0,
                    likedByMe: false
                };

                localStorage.setItem("sigma_announcements_feed_v3", JSON.stringify([post]));
                window.SigmaAnnouncements.openPostLightbox("test_nav_post", 0);
            })()`
        });

        await new Promise(r => setTimeout(r, 600));

        // 1. Desktop
        const deskStyles = await sendSession('Runtime.evaluate', {
            returnByValue: true,
            expression: `(() => {
                const prev = document.getElementById('sigma-lightbox-btn-prev');
                const next = document.getElementById('sigma-lightbox-btn-next');
                const close = document.getElementById('sigma-lightbox-btn-close');
                function getInfo(btn) {
                    const cs = window.getComputedStyle(btn);
                    return {
                        cursor: cs.cursor,
                        backgroundColor: cs.backgroundColor,
                        border: cs.border,
                        boxShadow: cs.boxShadow,
                        color: cs.color,
                        borderRadius: cs.borderRadius
                    };
                }
                return { close: getInfo(close), prev: getInfo(prev), next: getInfo(next) };
            })()`
        });
        console.log('Desktop Buttons Computed Style:', deskStyles.result.value);

        const shotDesktop = await sendSession('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'nav_desktop_clean.png'), Buffer.from(shotDesktop.data, 'base64'));
        console.log('Saved nav_desktop_clean.png');

        // 2. Mobile Portrait
        await sendSession('Emulation.setDeviceMetricsOverride', {
            width: 390,
            height: 844,
            deviceScaleFactor: 2,
            mobile: true
        });
        await new Promise(r => setTimeout(r, 400));

        const mobStyles = await sendSession('Runtime.evaluate', {
            returnByValue: true,
            expression: `(() => {
                const prev = document.getElementById('sigma-lightbox-btn-prev');
                const next = document.getElementById('sigma-lightbox-btn-next');
                const close = document.getElementById('sigma-lightbox-btn-close');
                function getInfo(btn) {
                    const cs = window.getComputedStyle(btn);
                    return {
                        cursor: cs.cursor,
                        backgroundColor: cs.backgroundColor,
                        border: cs.border,
                        boxShadow: cs.boxShadow,
                        color: cs.color,
                        borderRadius: cs.borderRadius
                    };
                }
                return { close: getInfo(close), prev: getInfo(prev), next: getInfo(next) };
            })()`
        });
        console.log('Mobile Buttons Computed Style:', mobStyles.result.value);

        const shotMobile = await sendSession('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'nav_mobile_clean.png'), Buffer.from(shotMobile.data, 'base64'));
        console.log('Saved nav_mobile_clean.png');

        await send('Target.closeTarget', { targetId });
        ws.close();
    } finally {
        chrome.kill();
    }
}

run();
