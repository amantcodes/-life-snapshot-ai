/**
 * Life Snapshot AI — sw.js (Service Worker)
 * ════════════════════════════════════════════════════════════
 * Handles:
 *  1. Offline caching (app works without internet)
 *  2. Background notification scheduling
 *
 * Place this file in your ROOT folder (same level as index.html)
 * ════════════════════════════════════════════════════════════
 */

const CACHE_NAME = 'lsai-v2-cache-v1';

/* All files to cache for offline use */
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/onboarding.css',
  '/onboarding.js',
  '/manifest.json',
];

/* ── INSTALL: Cache all files ── */
self.addEventListener('install', event => {
  console.log('✦ SW: Installing and caching files…');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        // Don't fail install if some external CDN files aren't cached
        console.warn('SW: Some files failed to cache (CDN?):', err);
      });
    })
  );
  self.skipWaiting(); // Activate immediately
});

/* ── ACTIVATE: Clean old caches ── */
self.addEventListener('activate', event => {
  console.log('✦ SW: Activating…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('SW: Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim(); // Take control of all pages
});

/* ── FETCH: Serve from cache, fallback to network ── */
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }

      // Not in cache — fetch from network
      return fetch(event.request).then(networkResponse => {
        // Cache successful responses for next time
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed — return offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});

/* ── MESSAGE: Handle messages from main app ── */
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const time = event.data.time;
    console.log('✦ SW: Notification scheduled for', time);
    // Store the time preference in SW scope
    self._notifTime = time;
  }
});

/* ── NOTIFICATION CLICK: Focus the app when notification is clicked ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('life-snapshot') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});