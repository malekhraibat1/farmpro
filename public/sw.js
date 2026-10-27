/* فارما برو - Service Worker
 * - ملفات التطبيق الثابتة (assets/ بأسماء مجزّأة): تُخزَّن وتُخدَم من الذاكرة أولاً
 * - صفحة index.html: الشبكة أولاً، وعند انقطاع الإنترنت تُخدَم النسخة المخزّنة
 * - لا يعترض طلبات Supabase ولا أي نطاق آخر (البيانات لا تُخزَّن هنا أبداً)
 * عند إصدار نسخة جديدة غيّر رقم VERSION ليُحدَّث التخزين تلقائياً.
 */
const VERSION = 'pharma-pro-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // لا نتدخل في الطلبات الخارجية (Supabase وغيره)

  // صفحات التنقل: الشبكة أولاً، ثم النسخة المخزّنة عند انقطاع الإنترنت
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // ملفات ثابتة: المخزّن أولاً ثم الشبكة مع تحديث المخزّن
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
