// App Shell service worker (see spec/ARCHITECTURE.md, PWA / Offline).
// The build version comes from the registration URL (/sw.js?v=<version>),
// so every build gets its own cache and old caches are removed on activate.

const VERSION = new URL(self.location.href).searchParams.get("v") || "0";
const CACHE_PREFIX = "jokes-shell-";
const CACHE_NAME = CACHE_PREFIX + VERSION;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/illustrations/clown.webp",
  "/illustrations/friends.webp",
];

const CACHE_FIRST_PREFIXES = ["/_next/static/", "/_next/image", "/icons/", "/illustrations/"];

function isCacheFirst(url) {
  return (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico" ||
    CACHE_FIRST_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function isCacheable(response) {
  return response && response.status === 200 && response.type === "basic";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// The page sends the assets it loaded before this worker controlled it.
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_URLS" || !Array.isArray(data.urls)) return;

  const urls = data.urls.filter((href) => {
    try {
      const url = new URL(href);
      return url.origin === self.location.origin && isCacheFirst(url);
    } catch {
      return false;
    }
  });

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        urls.map((href) =>
          cache.match(href).then((hit) => {
            if (hit) return;
            return fetch(href)
              .then((response) => (isCacheable(response) ? cache.put(href, response) : undefined))
              .catch(() => {});
          }),
        ),
      ),
    ),
  );
});

async function networkFirstPage(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put("/", response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match("/");
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const fallback = await cachedImageVariant(cache, request);
    if (fallback) return fallback;
    throw error;
  }
}

// Offline, an optimized image may be requested at a width that was never cached;
// any cached width of the same source image is good enough.
async function cachedImageVariant(cache, request) {
  const url = new URL(request.url);
  if (url.pathname !== "/_next/image") return undefined;
  const source = url.searchParams.get("url");
  const keys = await cache.keys();
  const match = keys.find((key) => {
    const keyUrl = new URL(key.url);
    return keyUrl.pathname === "/_next/image" && keyUrl.searchParams.get("url") === source;
  });
  return match ? cache.match(match) : undefined;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Only GET requests on this origin; POST /api/joke and all APIs go straight to the network.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    if (url.pathname === "/") event.respondWith(networkFirstPage(request));
    return;
  }

  if (isCacheFirst(url)) {
    event.respondWith(cacheFirst(request));
  }
});
