// Service worker: offline copy of the app and safe updates.
// Rules (CLAUDE.md section 6): only ever deletes its own caches (prefix "ht-");
// never touches IndexedDB.
import { APP_VERSION } from './version.js';

const CACHE_PREFIX = 'ht-';
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

// Every file the app needs to run offline. Add new files here.
const APP_FILES = [
  './',
  './index.html',
  './app.js',
  './version.js',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './vendor/dexie.mjs',
  './vendor/eruda.js',
];

self.addEventListener('install', (event) => {
  // Fetch fresh copies, bypassing the browser's HTTP cache.
  // No skipWaiting() here: the new version waits until the owner taps the banner.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Cache first. Page loads ignore the query string so "./?debug=1" works offline too.
  event.respondWith(
    caches.open(CACHE_NAME)
      .then((cache) => cache.match(request, { ignoreSearch: request.mode === 'navigate' }))
      .then((cached) => cached || fetch(request))
  );
});
