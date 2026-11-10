// Xuất một hiệu ứng pixelfx thành HAI sheet như beanfx: lớp màu (vẽ thường) + lớp sáng (vẽ cộng sáng).
// Sheet gộp sẵn của pixelfx chỉ đẹp trên nền tối; trên nền cỏ sáng, quầng sáng thành màu đục.
// Kết quả đọc thẳng bằng loadFx của lib/beanfx.js.
//
//   node tools/pixelfx_layers.mjs <pixelfx-repo> <nhom/ten> <ten-xuat> [thu-muc-ra]
//   node tools/pixelfx_layers.mjs ../pixelfx fire/hoa-long-quyen hoa-long-quyen
//
// Hiệu ứng tự làm (vd. vfx/pixelfx/hoa-long-quyen.js) phải được chép vào <pixelfx-repo>/src/fx/<nhom>/ trước.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repo, id, name, outArg] = process.argv.slice(2);
if (!repo || !id || !name) {
  console.error('dùng: node tools/pixelfx_layers.mjs <pixelfx-repo> <nhom/ten> <ten-xuat> [thu-muc-ra]');
  process.exit(1);
}
const out = resolve(outArg || 'fx/pixelfx');
const lib = await import(pathToFileURL(join(resolve(repo), 'tools/lib/fxlib.mjs')).href);
const { encodePNG } = await import(pathToFileURL(join(resolve(repo), 'tools/lib/png.mjs')).href);

const fx = await lib.loadEffect(id);
const r = lib.renderFrames(fx, { bg: 'none', actor: false });
const { w, h, fps, frames } = r, n = frames.length;
const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w)))), rows = Math.ceil(n / cols);
const W = cols * w, Hh = rows * h;
const color = new Uint8ClampedArray(W * Hh * 4), light = new Uint8ClampedArray(W * Hh * 4);
frames.forEach((f, i) => {
  const ox = (i % cols) * w, oy = Math.floor(i / cols) * h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = y * w + x, d = ((oy + y) * W + ox + x) * 4, c = f.raw[s], l = f.light[s];
    color[d] = c & 255; color[d + 1] = (c >>> 8) & 255; color[d + 2] = (c >>> 16) & 255; color[d + 3] = c >>> 24;
    light[d] = l & 255; light[d + 1] = (l >>> 8) & 255; light[d + 2] = (l >>> 16) & 255; light[d + 3] = 255;
  }
});
mkdirSync(out, { recursive: true });
writeFileSync(join(out, `${name}_color.png`), encodePNG(W, Hh, color));
writeFileSync(join(out, `${name}_light.png`), encodePNG(W, Hh, light));
const m = fx.meta;
const json = {
  frames: frames.map((f, i) => ({ filename: `${name} ${i}`, frame: { x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h }, duration: Math.round(1000 / fps) })),
  meta: {
    app: 'pixelfx -> tools/pixelfx_layers.mjs', image: `${name}_color.png`, size: { w: W, h: Hh },
    frameTags: [{ name, from: 0, to: n - 1, direction: 'forward' }],
    beanfx: {
      name, fps, frames: n, rows: 1, frameSize: [w, h], pivot: m.origin, columns: cols, loop: !!m.loop, end: m.loop ? 'loop' : 'remove',
      sheet: `${name}_color.png`, color: `${name}_color.png`, light: `${name}_light.png`, blend_light: 'add', light_gain: 1,
      source: `pixelfx ${id}`,
    },
  },
};
writeFileSync(join(out, `${name}.json`), JSON.stringify(json, null, 1));
console.log(`${name}: ${n} khung ${w}x${h}, lớp màu + lớp sáng -> ${out}`);
