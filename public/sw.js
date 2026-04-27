const CACHE_NAME = 'blinkbuy-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

// Install - cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy: Network first for API, cache first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Skip non-GET, chrome-extension, supabase API calls
  if (e.request.method !== 'GET') return;
  if (url.hostname.includes('supabase')) return;
  
  // For HTML navigation - network first, fallback to cached index
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  // For assets - cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
