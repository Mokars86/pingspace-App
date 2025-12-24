
const CACHE_NAME = 'pingspace-v1';
const ASSETS_TO_CACHE = [
  './',
  'index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

/**
 * Handle Push Notifications from Server
 */
self.addEventListener('push', (event) => {
  let data = { title: 'New Ping', body: 'Someone sent you a message.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Ping', body: event.data.text() };
    }
  }

  const iconUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='120' fill='%23ff1744'/%3E%3Cpath d='M298.67 42.67L64 320h170.67L192 469.33L426.67 192H256L298.67 42.67z' fill='white'/%3E%3C/svg%3E";

  const options = {
    body: data.body,
    icon: iconUrl,
    badge: iconUrl,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Handle Notification Clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        // Match relative to current scope
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || './');
      }
    })
  );
});
