// Nạp sprite sheet xuất từ pixelfx (fx/pixelfx/, MIT) và phát bằng trình phát beanfx sẵn có.
// Sheet pixelfx là Aseprite JSON với meta.pixelfx; ta dựng meta.beanfx tương đương rồi đưa cho fromJson.
import { fromJson } from '../../lib/beanfx.js';

export function toBeanfxMeta(px) {
  return {
    name: px.id || px.name, fps: px.fps, frames: px.frames, rows: 1, frameSize: px.frameSize,
    pivot: px.pivot, columns: px.columns, loop: !!px.loop, end: px.loop ? 'loop' : 'remove',
  };
}

const loadImage = src => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => fail(new Error('pixelfx: không tải được ' + src));
  img.src = src;
});

export async function loadPixelfx(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('pixelfx: không tải được ' + url);
  const json = await res.json();
  if (!json.meta || !json.meta.pixelfx) throw new Error('pixelfx: thiếu meta.pixelfx trong ' + url);
  json.meta.beanfx = toBeanfxMeta(json.meta.pixelfx);
  const base = new URL('.', new URL(url, location.href)).href;
  return fromJson(json, { sheet: [await loadImage(base + json.meta.image)] });
}

// Vẽ một khung bất kỳ (không cần đối tượng phát riêng): dùng cho nhiều vật giống nhau lệch pha, như viên chiến ý.
export function drawFrame(ctx, asset, frame, x, y) {
  const m = asset.meta, r = asset.frames[((frame % m.frames) + m.frames) % m.frames];
  ctx.drawImage(asset.images.sheet[0], r.x, r.y, r.w, r.h, Math.round(x) - m.pivot[0], Math.round(y) - m.pivot[1], r.w, r.h);
}
