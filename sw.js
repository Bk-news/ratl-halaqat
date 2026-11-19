try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) {}
// تطبيق كفالات رتّل: يجيب دائمًا آخر نسخة من الإنترنت، ويحتفظ بنسخة يفتحها بدون نت
var CACHE = 'ratl-app-v8';
var SHELL = ['./', './index.html', './page.html', './shim.js', './qr.js', './app.js', './theme.js', './brand.json', './data.json', './kafala.html', './kafala-page.html', './kafala.js', './push.js',
  './fonts/thmanyahsans-Regular.woff2', './fonts/thmanyahsans-Medium.woff2', './fonts/thmanyahsans-Bold.woff2',
  './fonts/thmanyahserifdisplay-Regular.woff2', './fonts/thmanyahserifdisplay-Bold.woff2', './icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return; // الجدول وقوقل: مباشرة بدون تخزين
  var isFont = /\/fonts\//.test(url.pathname);
  if (isFont) { e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) { return r || fetch(req); })); return; }
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(url.origin + url.pathname, copy); }); }
    return res;
  }).catch(function () { return caches.match(url.origin + url.pathname).then(function (r) { return r || caches.match('./index.html'); }); }));
});
