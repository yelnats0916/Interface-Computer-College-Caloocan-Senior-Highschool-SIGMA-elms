const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\stanl\\.gemini\\antigravity\\brain\\75a5d647-ef0c-42e1-8707-1b6ec8cab770';

async function run() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9246',
        '--window-size=1280,800',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9246/json/version');
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

        // Inject sample posts with valid canvas data URLs
        await sendSession('Runtime.evaluate', {
            expression: `(() => {
                function makeCanvasImg(w, h, color, text) {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(text, w / 2, h / 2);
                    return canvas.toDataURL('image/png');
                }

                const dummyImg1 = makeCanvasImg(800, 500, '#2563eb', 'Sample Photo 1 (Landscape)');
                const dummyImg2 = makeCanvasImg(450, 750, '#059669', 'Sample Photo 2 (Portrait)');
                const dummyImg3 = makeCanvasImg(600, 600, '#d97706', 'Sample Photo 3 (Square)');

                const samplePosts = [
                    {
                        id: 'test_post_single',
                        authorName: 'Jacqueline Artates',
                        authorRole: 'General Manager',
                        authorAvatar: 'assets/images/users/avatar-1.jpg',
                        timestamp: '2 hours ago',
                        content: 'Single image test announcement.',
                        mediaType: 'image',
                        mediaUrl: dummyImg1,
                        mediaUrls: [dummyImg1],
                        likes: 4,
                        likedByMe: false,
                        comments: []
                    },
                    {
                        id: 'test_post_multi',
                        authorName: 'Jacqueline Artates',
                        authorRole: 'General Manager',
                        authorAvatar: 'assets/images/users/avatar-1.jpg',
                        timestamp: 'Just now',
                        content: 'Multi image test announcement.',
                        mediaType: 'image',
                        mediaUrls: [dummyImg1, dummyImg2, dummyImg3],
                        likes: 12,
                        likedByMe: true,
                        comments: []
                    }
                ];

                localStorage.setItem('sigma_announcements_feed_v3', JSON.stringify(samplePosts));
                if (window.SigmaAnnouncements && window.SigmaAnnouncements.renderFeed) {
                    window.SigmaAnnouncements.renderFeed();
                }
            })()`
        });

        await new Promise(r => setTimeout(r, 600));

        async function inspectAndCapture(name, width, height) {
            await sendSession('Emulation.setDeviceMetricsOverride', {
                width: width,
                height: height,
                deviceScaleFactor: 2,
                mobile: width < 1000
            });
            await new Promise(r => setTimeout(r, 400));

            const metrics = await sendSession('Runtime.evaluate', {
                returnByValue: true,
                expression: `(() => {
                    const closeBtn = document.getElementById('sigma-lightbox-btn-close');
                    const likeBtn = document.getElementById('sigma-lightbox-btn-like');
                    const prevBtn = document.getElementById('sigma-lightbox-btn-prev');
                    const nextBtn = document.getElementById('sigma-lightbox-btn-next');
                    const counter = document.getElementById('sigma-lightbox-counter');
                    const img = document.getElementById('sigma-lightbox-img');

                    function getRect(el) {
                        if (!el) return null;
                        const cs = window.getComputedStyle(el);
                        if (cs.display === 'none' || cs.visibility === 'hidden' || el.classList.contains('hidden')) return null;
                        const r = el.getBoundingClientRect();
                        return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
                    }

                    return {
                        viewport: { width: window.innerWidth, height: window.innerHeight },
                        close: getRect(closeBtn),
                        like: getRect(likeBtn),
                        prev: getRect(prevBtn),
                        next: getRect(nextBtn),
                        counter: getRect(counter),
                        img: getRect(img)
                    };
                })()`
            });

            const val = (metrics && metrics.result) ? metrics.result.value : (metrics ? metrics.value : null);
            console.log('=== Metrics for ' + name + ' ===', JSON.stringify(val, null, 2));

            const screenshot = await sendSession('Page.captureScreenshot', { format: 'png' });
            const filePath = path.join(ARTIFACT_DIR, name + '.png');
            fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
            console.log('Saved screenshot: ' + filePath);
        }

        // 1. Mobile Portrait Single
        await sendSession('Runtime.evaluate', {
            expression: `window.SigmaAnnouncements.openPostLightbox('test_post_single', 0)`
        });
        await new Promise(r => setTimeout(r, 400));
        await inspectAndCapture('lightbox_portrait_single', 390, 844);

        // 2. Mobile Portrait Multi
        await sendSession('Runtime.evaluate', {
            expression: `window.SigmaAnnouncements.openPostLightbox('test_post_multi', 0)`
        });
        await new Promise(r => setTimeout(r, 400));
        await inspectAndCapture('lightbox_portrait_multi', 390, 844);

        // 3. Mobile Landscape Multi
        await inspectAndCapture('lightbox_landscape_multi', 844, 390);

        // 4. Mobile Landscape Single
        await sendSession('Runtime.evaluate', {
            expression: `window.SigmaAnnouncements.openPostLightbox('test_post_single', 0)`
        });
        await new Promise(r => setTimeout(r, 400));
        await inspectAndCapture('lightbox_landscape_single', 844, 390);

        // 5. Desktop Multi
        await sendSession('Runtime.evaluate', {
            expression: `window.SigmaAnnouncements.openPostLightbox('test_post_multi', 0)`
        });
        await new Promise(r => setTimeout(r, 400));
        await inspectAndCapture('lightbox_desktop_multi', 1280, 800);

        await send('Target.closeTarget', { targetId });
        ws.close();
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        chrome.kill();
    }
}

run();
