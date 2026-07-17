const CACHE_VERSION = 'recipes-v5';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const CONTENT_CACHE = `${CACHE_VERSION}-content`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const SHELL_FILES = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'js/auth.js',
  'js/config.js',
  'js/markdown.js',
  'js/pull-to-refresh.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shellCache = await caches.open(SHELL_CACHE);
      await shellCache.addAll(SHELL_FILES);

      try {
        const res = await fetch('data/recipes-index.json', { cache: 'no-cache' });
        if (res.ok) {
          const index = await res.json();
          const contentCache = await caches.open(CONTENT_CACHE);
          await contentCache.put('data/recipes-index.json', res.clone());
          await Promise.all(
            index.recipes.map(async (r) => {
              try {
                const recipeRes = await fetch(r.path, { cache: 'no-cache' });
                if (recipeRes.ok) await contentCache.put(r.path, recipeRes);
              } catch {
                // best effort — skip recipes that fail to fetch at install time
              }
            })
          );
        }
      } catch {
        // offline install or index missing — app shell still works
      }

      try {
        const pantryRes = await fetch('data/pantry-index.json', { cache: 'no-cache' });
        if (pantryRes.ok) {
          const contentCache = await caches.open(CONTENT_CACHE);
          await contentCache.put('data/pantry-index.json', pantryRes);
        }
      } catch {
        // offline install or pantry index missing — app shell still works
      }

      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, CONTENT_CACHE, IMAGE_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      self.clients.claim();
    })()
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('offline and not cached');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith('/data/recipes-index.json') || url.pathname.endsWith('/data/pantry-index.json') || url.pathname.includes('/content/')) {
      // Network-first, not stale-while-revalidate: the app has explicit
      // "Refresh" actions (list and per-recipe) whose whole point is to show
      // the latest content on click — stale-while-revalidate would instead
      // serve the cached copy immediately and only update it in the
      // background for the *next* load, silently defeating those buttons.
      event.respondWith(networkFirst(request, CONTENT_CACHE));
    } else {
      event.respondWith(networkFirst(request, SHELL_CACHE));
    }
  } else {
    // Timeline images etc. hosted on wolframcloud.com — cache opportunistically
    event.respondWith(networkFirst(request, IMAGE_CACHE));
  }
});
