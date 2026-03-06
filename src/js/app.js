// confirmar si podemos usar el SW
if (navigator.serviceWorker) {
    navigator.serviceWorker.register('./sw.js');
}

if (window.caches) {
    caches.open('mi - cache');
    caches.has('cache-v1').then(console.log);
    caches.open('mi-cache-2');
    caches.open('mi-cache-3');
    caches.delete('cache-v1').then(console.log);
}