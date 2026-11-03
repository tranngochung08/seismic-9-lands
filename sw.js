/* sw.js — p121 (anh 03/11): CHỈ THỬ LẠI khi GitHub Pages trả 429 / 503 / lỗi mạng (tải dồn lúc đông người).
   Không cache gì thêm, không đổi nội dung: request nào cũng đi thẳng mạng như cũ; chỉ khi lỗi tạm thì chờ rồi thử lại (tối đa 5 lần, chờ lâu dần).
   Chỉ áp cho GET cùng nguồn. Tắt: ?sw=0 (index.html gỡ đăng ký). */
const RETRY = [400, 900, 1800, 3200, 5000];
const TEMP = s => s === 429 || s === 502 || s === 503 || s === 504;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    let last = null;
    for (let i = 0; i <= RETRY.length; i++) {
      try {
        const res = await fetch(r.clone ? r.clone() : r);
        if (!TEMP(res.status) || i === RETRY.length) return res;
        last = res;
      } catch (err) { if (i === RETRY.length) throw err; }
      const ra = last && +last.headers.get('retry-after');
      await new Promise(ok => setTimeout(ok, ra > 0 && ra < 10 ? ra * 1000 : RETRY[i] * (0.8 + Math.random() * 0.4)));
    }
    return last;
  })());
});
