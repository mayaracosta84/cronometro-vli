const CACHE_NAME = 'vli-cronometro-v3.12';

// Instala e ativa imediatamente
self.addEventListener('install', event => {
    console.log('📦 Service Worker v3.12 instalando...');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('🔄 Service Worker v3.12 ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker v3.12 ativo!');
            return self.clients.claim();
        })
    );
});

// Estratégia: Cache First para mesma origem, Network apenas para externas
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Apenas para requisições do mesmo domínio
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        console.log('✅ Servindo do cache:', event.request.url);
                        return cachedResponse;
                    }
                    
                    // Busca da rede e salva no cache
                    return fetch(event.request)
                        .then(response => {
                            if (!response || response.status !== 200 || response.type === 'error') {
                                return response;
                            }
                            
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                    console.log('💾 Salvo no cache:', event.request.url);
                                });
                            
                            return response;
                        })
                        .catch(() => {
                            // Offline: tenta buscar do cache qualquer HTML
                            console.log('🛜 OFFLINE - buscando qualquer HTML do cache');
                            return caches.match('/cronometro-vli/')
                                .then(r => r || caches.match('/cronometro-vli/index.html'))
                                .then(r => r || caches.match('/'))
                                .then(r => r || new Response('Offline - Recarregue quando estiver online', {
                                    headers: { 'Content-Type': 'text/html' }
                                }));
                        });
                })
        );
    } else {
        // Requisições externas: apenas tenta buscar, não cacheia
        event.respondWith(fetch(event.request));
    }
});
