self.addEventListener('fetch'
    , event => {
        const offlineResp = fetch('./src/pages/offline.html');

        const resp = fetch(event.request)
            .catch(() => {
                return offlineResp;
            });
        event.respondWith(resp);
    });     