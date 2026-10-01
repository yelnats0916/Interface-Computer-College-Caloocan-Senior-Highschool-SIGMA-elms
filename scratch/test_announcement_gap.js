const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\stanl\\.gemini\\antigravity\\brain\\75a5d647-ef0c-42e1-8707-1b6ec8cab770';

async function testGap() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9233',
        '--window-size=390,844',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9233/json/version');
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

        const { targetId } = await send('Target.createTarget', { url: 'http://127.0.0.1:5519/teacher.html' });
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

        await new Promise(r => setTimeout(r, 1500));

        // Inject 2 posts into the feed just like user's screenshot
        const evalRes = await sendSession('Runtime.evaluate', {
            expression: `(() => {
                const feed = document.querySelector('#admin-announcements-feed');
                if (!feed) return { error: 'No feed' };
                feed.innerHTML = \`
                    <article class="sigma-announcement-card">
                        <div class="sigma-card-header-row">
                            <div class="sigma-card-author-meta">
                                <div class="sigma-user-avatar">SG</div>
                                <div><b>Stanley Garcia</b><div>Administrator</div></div>
                            </div>
                        </div>
                        <div class="sigma-card-post-body">First post with image</div>
                        <div class="sigma-card-footer-row">
                            <button type="button" class="sigma-card-like-btn"><span>1 Likes</span></button>
                        </div>
                    </article>
                    <article class="sigma-announcement-card">
                        <div class="sigma-card-header-row">
                            <div class="sigma-card-author-meta">
                                <div class="sigma-user-avatar">SG</div>
                                <div><b>Stanley Garcia</b><div>Administrator</div></div>
                            </div>
                        </div>
                        <div class="sigma-card-post-body">asdasdad</div>
                        <div class="sigma-card-footer-row">
                            <button type="button" class="sigma-card-like-btn"><span>0 Likes</span></button>
                        </div>
                    </article>
                \`;

                // Scroll to bottom
                window.scrollTo(0, document.body.scrollHeight);

                const articles = Array.from(feed.querySelectorAll('article'));
                const last = articles[articles.length - 1];
                const footer = last.querySelector('.sigma-card-footer-row');

                return {
                    feedPadding: window.getComputedStyle(feed).padding,
                    feedMargin: window.getComputedStyle(feed).margin,
                    feedHeight: feed.getBoundingClientRect().height,
                    lastArticle: {
                        height: last.getBoundingClientRect().height,
                        padding: window.getComputedStyle(last).padding,
                        margin: window.getComputedStyle(last).margin,
                        footerBottom: footer.getBoundingClientRect().bottom,
                        lastBottom: last.getBoundingClientRect().bottom,
                        diff: last.getBoundingClientRect().bottom - footer.getBoundingClientRect().bottom
                    },
                    mainCol: {
                        padding: window.getComputedStyle(document.querySelector('.main-dashboard-column')).padding,
                        margin: window.getComputedStyle(document.querySelector('.main-dashboard-column')).margin
                    },
                    dashboardGrid: {
                        padding: window.getComputedStyle(document.querySelector('.dashboard-grid')).padding,
                        margin: window.getComputedStyle(document.querySelector('.dashboard-grid')).margin
                    }
                };
            })()`,
            returnByValue: true
        });

        console.log('DOM Evaluation:', JSON.stringify(evalRes.result.value, null, 2));

        // Take screenshot of bottom
        const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'test_bottom_gap.png'), Buffer.from(shot.data, 'base64'));
        console.log('Saved test_bottom_gap.png');

        await send('Target.closeTarget', { targetId });
        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
}

testGap();
