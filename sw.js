const CACHE_NAME = 'cortijo-pwa-v1';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch((err) => {
            // Solo devolvemos HTML si la peticion original era una carga de la página
            if (event.request.mode === 'navigate') {
                return new Response(
                    '<!DOCTYPE html><html><body><h2 style="font-family:sans-serif; text-align:center; margin-top:50px;">Cortijo Velasco: Sin Conexión a Internet o Servidor Inaccesible</h2></body></html>',
                    { headers: { 'Content-Type': 'text/html' } }
                );
            }
            // Para todo lo demas (js, API) tiramos el error limpio sin alterar
            throw err;
        })
    );
});
