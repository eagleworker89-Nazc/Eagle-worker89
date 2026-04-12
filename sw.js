/* Eagle Worker⁸⁹ — Service Worker v3
   Cache-first para assets estáticos, network-first para Firebase */

const CACHE_NAME = 'ew89-v3';

const PRECACHE_URLS = [
    '/',
    '/Index.html',
    'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// URLs que NUNCA devem ser cacheadas (sempre online)
const BYPASS_PATTERNS = [
    'firebaseio.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'googleapis.com/firebase',
    'accounts.google.com'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // Ignorar Firebase e autenticação — sempre direto à rede
    if (BYPASS_PATTERNS.some(p => url.includes(p))) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            // Retornar cache imediatamente, atualizar em background
            const fetchPromise = fetch(event.request)
                .then(response => {
                    if (!response || response.status !== 200 || response.type === 'opaque') {
                        return response;
                    }
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                    });
                    return response;
                })
                .catch(() => null);

            return cached || fetchPromise.then(r => r || new Response(
                '<h1 style="font-family:monospace;text-align:center;margin-top:40vh;color:#4a9e96">⚠️ Sem conexão<br><small>Eagle Worker⁸⁹</small></h1>',
                { headers: { 'Content-Type': 'text/html' } }
            ));
        })
    );
});

// Receber mensagem para forçar atualização
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
