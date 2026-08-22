const ASSET_CACHE = "architecture-simulator-assets-v1";
const ASSET_PATH_MARKER = "/assets/";

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("architecture-simulator-assets-") && key !== ASSET_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.includes(ASSET_PATH_MARKER)) return;

  // 清单决定资源版本，必须优先读取网络；离线时才回退到上次缓存。
  if (url.pathname.endsWith("/assets/asset-manifest.json")) {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(request)) || Response.error()),
    );
    return;
  }

  const cachePromise = caches.open(ASSET_CACHE);
  const cachedResponsePromise = cachePromise.then((cache) => cache.match(request));
  const updatePromise = cachePromise.then((cache) =>
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok && networkResponse.status === 200) {
        return cache.put(request, networkResponse.clone()).then(() => networkResponse);
      }
      return networkResponse;
    }),
  );

  // 命中缓存时立即返回，同时在后台刷新；首次访问则等待网络响应。
  event.waitUntil(updatePromise.catch(() => undefined));
  event.respondWith(cachedResponsePromise.then((cachedResponse) => cachedResponse || updatePromise));
});
