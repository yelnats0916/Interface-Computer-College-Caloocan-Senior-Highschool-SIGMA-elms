// Live Server's injected client does not close its socket before a page is cached.
(function () {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
        || !window.WebSocket) return;

    const NativeWebSocket = window.WebSocket;
    const clients = new Set();
    const livePath = window.location.pathname + '/ws';
    window.WebSocket = new Proxy(NativeWebSocket, {
        construct(Target, args) {
            const socket = Reflect.construct(Target, args);
            const url = new URL(String(args[0]), window.location.href);
            if (url.host === window.location.host && url.pathname === livePath) {
                clients.add({ socket, current: socket, args, suspended: false });
            }
            return socket;
        }
    });

    window.addEventListener('pagehide', () => {
        for (const client of clients) {
            client.suspended = client.current.readyState < NativeWebSocket.CLOSING;
            if (client.suspended) client.current.close(1000, 'Page hidden');
        }
    });
    window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        for (const client of clients) {
            if (!client.suspended) continue;
            client.suspended = false;
            const socket = Reflect.construct(NativeWebSocket, client.args);
            client.current = socket;
            // Preserve the injected client's reload and CSS-refresh handlers.
            socket.addEventListener('message', event => {
                client.socket.dispatchEvent(new MessageEvent('message', {
                    data: event.data, origin: event.origin, lastEventId: event.lastEventId
                }));
            });
        }
    });
})();
