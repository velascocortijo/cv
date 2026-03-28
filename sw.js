const CACHE_NAME = 'cortijo-pwa-v1';

// Al instalar, simplemente esperamos
self.addEventListener('install', event => {
    self.skipWaiting();
});

// Al activar, tomamos control inmediato de las pestañas
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

// Respetamos nuestra lógica de Hourly Cache Busting:
// Hacemos "Network First" (intentamos la red principal).
// Si el usuario no tiene internet, capturamos el error para que la PWA no se rompa de golpe.
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            // Solo devolvemos una mini-respuesta para evitar bloqueos puros de red
            // en peticiones críticas cuando se pierde conexión (modo offline básico).
            return new Response(
                '<!DOCTYPE html><html><body><h2 style="font-family:sans-serif; text-align:center; margin-top:50px;">Cortijo Velasco: Sin Conexión a Internet</h2></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        })
    );
});
