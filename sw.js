// Service worker: luôn hỏi lại máy chủ trước khi dùng file đã lưu (GitHub Pages cho trình duyệt giữ file 10 phút
// -> vừa cập nhật web người chơi vẫn thấy bản cũ). Mỗi yêu cầu cùng trang gửi kèm kiểm tra phiên bản (If-Modified-Since/ETag):
// file không đổi thì máy chủ trả 304 rất nhẹ, file đổi thì tải bản mới. Mất mạng thì dùng bản trong bộ nhớ đệm.
// Không đụng tới localStorage/save.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).catch(() => fetch(req)));
});
