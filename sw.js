// ============================================================
//  GastoSmart – Service Worker
//  Estrategias implementadas:
//  1) Cache Only
//  2) Cache with network fallback
//  3) Network with cache fallback
// ============================================================

const CACHE_VERSION = 'v5';
const CACHE_STATIC_NAME = `gastosmart-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC_NAME = `gastosmart-dynamic-${CACHE_VERSION}`;
const DYNAMIC_CACHE_LIMIT = 50;

/** Recursos del App Shell que se precargan en la instalación */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './src/js/app.js',
  './src/js/constants.js',
  './src/js/helpers.js',
  './src/js/ui.js',
  './src/js/storage.js',
  './src/js/expenses.js',
  './src/js/dashboard.js',
  './src/js/expense-form.js',
  './src/js/budget-form.js',
  './src/js/history.js',
  './src/js/reports.js',
  './src/js/excel-export.js',
  './src/pages/offline.html',
  './src/img/icon-192.svg',
  './src/img/icon-512.svg',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// ==================== INSTALL ====================
self.addEventListener('install', event => {
  console.log('[SW] Instalando – versión:', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(cache => {
        console.log('[SW] Precargando App Shell en caché…');
        // addAll falla si algún recurso no responde; usamos Promise.allSettled
        // para que un fallo en una CDN no impida instalar el SW.
        return Promise.allSettled(
          APP_SHELL.map(url => cache.add(url).catch(err => {
            console.warn('[SW] No se pudo cachear:', url, err.message);
          }))
        );
      })
      .then(() => {
        console.log('[SW] App Shell cargado. Activando sin espera…');
        return self.skipWaiting();   // activa el SW inmediatamente
      })
      .catch(err => console.error('[SW] Error en install:', err))
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', event => {
  console.log('[SW] Activando – eliminando cachés obsoletas…');

  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(
            key =>
              key.startsWith('gastosmart-') &&
              key !== CACHE_STATIC_NAME &&
              key !== CACHE_DYNAMIC_NAME
          )
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log('[SW] Activación completa. Reclamando clientes…');
        return self.clients.claim();  // toma control de los clientes abiertos
      })
      .catch(err => console.error('[SW] Error en activate:', err))
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones no-GET y extensiones del navegador
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // 1) Cache Only para App Shell/CDN ya precargados.
  if (isAppShellRequest(request, url)) {
    event.respondWith(cacheOnly(request));
    return;
  }

  // 3) Network with cache fallback para navegación HTML.
  if (request.destination === 'document') {
    event.respondWith(networkWithCacheFallback(request, true));
    return;
  }

  // 2) Cache with network fallback para recursos estáticos no críticos.
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(cacheWithNetworkFallback(request));
    return;
  }

  // 3) Network with cache fallback para el resto (api/data/etc).
  event.respondWith(networkWithCacheFallback(request, false));
});

// ==================== HELPERS ====================

function isAppShellRequest(request, url) {
  return APP_SHELL.includes(request.url) ||
         APP_SHELL.includes(url.pathname) ||
         APP_SHELL.includes(url.href);
}

/** 1) Cache Only: responde solo desde caché, sin pedir red. */
async function cacheOnly(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return offlineFallback(request, request.destination === 'document');
}

/** 2) Cache with network fallback. */
async function cacheWithNetworkFallback(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      const cache = await caches.open(CACHE_DYNAMIC_NAME);
      await cache.put(request, response.clone());
      await limpiarCache(CACHE_DYNAMIC_NAME, DYNAMIC_CACHE_LIMIT);
    }
    return response;
  } catch (err) {
    console.warn('[SW] cacheWithNetworkFallback falló:', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * 3) Network with cache fallback: intenta red y, si falla, usa caché.
 * @param {boolean} isDocument - si es true, usa offline.html como último fallback.
 */
async function networkWithCacheFallback(request, isDocument) {
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      const cache = await caches.open(CACHE_DYNAMIC_NAME);
      await cache.put(request, response.clone());
      await limpiarCache(CACHE_DYNAMIC_NAME, DYNAMIC_CACHE_LIMIT);
    }
    return response;
  } catch (err) {
    console.warn('[SW] networkWithCacheFallback falló (sin red):', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request, isDocument);
  }
}

function shouldCacheResponse(response) {
  return !!response && (response.ok || response.type === 'opaque');
}

/**
 * Respuesta de emergencia cuando no hay red ni caché.
 */
function offlineFallback(request, isDocument = false) {
  if (isDocument || request.destination === 'document') {
    return caches.match('./src/pages/offline.html').then(r =>
      r || new Response('<h1>Sin conexión</h1>', {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    );
  }
  // Para recursos no-documento devolvemos una respuesta de error limpia
  return new Response(
    JSON.stringify({ error: 'Sin conexión', offline: true }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Limpia el caché eliminando los elementos más antiguos si supera el límite.
 * @param {string} cacheName - Nombre del caché a limpiar.
 * @param {number} nroItems - Número máximo de elementos permitidos en el caché.
 */
async function limpiarCache(cacheName, nroItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > nroItems) {
    await cache.delete(keys[0]);
    await limpiarCache(cacheName, nroItems);
  }
}
