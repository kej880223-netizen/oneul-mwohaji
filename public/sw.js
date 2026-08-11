// ─────────────────────────────────────────────────────────
//  서비스 워커 — 오프라인 캐싱
//  - 페이지 이동(navigate): 네트워크 우선, 실패 시 캐시 → 홈
//  - 정적 자원(_next, icons): 캐시 우선
//  - /api/ai(POST): 캐시하지 않음(클라이언트가 mock으로 폴백)
// ─────────────────────────────────────────────────────────

const CACHE = "omh-cache-v1";

const APP_SHELL = [
  "/",
  "/onboarding",
  "/today",
  "/now",
  "/records",
  "/profile",
  "/activity",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // 개별 실패가 전체를 막지 않도록 하나씩 캐시
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((e) => console.warn("[sw] skip", url, e))
          )
        )
      )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // GET 이외(POST /api/ai 등)는 SW가 건드리지 않음
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크 우선
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // 정적 자원: 캐시 우선
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (
            res.ok &&
            (url.pathname.startsWith("/_next/") ||
              url.pathname.startsWith("/icons/"))
          ) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
