// ============================================================
//  GastoSmart – Service Worker
//  Estrategias: Cache-First (App Shell) + Network-First (resto)
// ============================================================

const CACHE_VERSION = 'v1';
const CACHE_NAME  = `gastosmart-${CACHE_VERSION}`;

/** Recursos del App Shell que se precargan en la instalación */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './src/css/style.css',
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
    caches.open(CACHE_NAME)
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
          .filter(key => key.startsWith('gastosmart-') && key !== CACHE_NAME)
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

  // App Shell y recursos CDN → Cache-First
  if (isAppShellRequest(request, url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navegación a documentos HTML → Network-First con fallback offline
  if (request.destination === 'document') {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Resto de recursos → Network-First con caché como respaldo
  event.respondWith(networkFirst(request, false));
});

// ==================== HELPERS ====================

function isAppShellRequest(request, url) {
  return APP_SHELL.includes(request.url) ||
         APP_SHELL.includes(url.pathname) ||
         APP_SHELL.includes(url.href);
}

/**
 * Cache-First: sirve desde caché; si no está, lo obtiene de la red y lo guarda.
 */
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] cacheFirst falló:', request.url, err.message);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * Network-First: intenta la red; si falla, sirve desde caché.
 * @param {boolean} isDocument – si es true, sirve offline.html como fallback.
 */
async function networkFirst(request, isDocument) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] networkFirst falló (sin red):', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request, isDocument);
  }
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
