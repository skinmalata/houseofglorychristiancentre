/* ==========================================================================
   House of Glory Christian Centre | sw.js (service worker)
   Offline-first caching so the app — including the complete Bible —
   keeps working without a network connection.
   ========================================================================== */
"use strict";

var CACHE_VERSION = "house-of-glory-v1.0.0";

/* Core shell precached on install.
   js/bible-data.js (~4 MB, the full Bible) is runtime-cached the first
   time the Bible page is opened, keeping first install light. */
var PRECACHE = [
  "./",
  "./index.html",
  "./about.html",
  "./services.html",
  "./ministries.html",
  "./gallery.html",
  "./give.html",
  "./contact.html",
  "./bible.html",
  "./css/styles.css",
  "./js/main.js",
  "./js/bible.js",
  "./manifest.json",
  "./logo.jpg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return cache.addAll(PRECACHE);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_VERSION;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;

  if (request.method !== "GET") return;

  var url = new URL(request.url);

  /* Let cross-origin requests (Google Fonts, Facebook, etc.) pass through */
  if (url.origin !== self.location.origin) return;

  /* Page navigations: network first, cache fallback (stays fresh offline) */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match("./index.html");
          });
        })
    );
    return;
  }

  /* Static assets: cache first, then network (and cache for next time).
     This is also how js/bible-data.js gets stored for offline reading. */
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      });
    })
  );
});
