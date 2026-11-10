// Bản đồ: động phủ (giống hệt v0.1) và đấu trường bí cảnh. Thuần logic, không đụng DOM.
import { TILE as T, HUB } from '../core/config.js';
import { hash, noise } from '../core/rng.js';

export const GRASS = 0, WATER = 1, STONE = 2, TREE = 3, ROCK = 4;

function makeMap(w, h, seed, kind, gen) {
  const tiles = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[y * w + x] = gen(x, y);
  const m = { w, h, seed, kind, tiles, pw: w * T, ph: h * T, cx: w / 2 * T, cy: h / 2 * T };
  m.tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= w || ty >= h) ? TREE : tiles[ty * w + tx];
  m.solidPx = (px, py) => { const t = m.tileAt(Math.floor(px / T), Math.floor(py / T)); return t === WATER || t === TREE || t === ROCK; };
  // x, y là vị trí bàn chân; hộp va chạm nhỏ quanh chân
  m.canStand = (x, y) => Number.isFinite(x) && Number.isFinite(y) &&
    !m.solidPx(x - 4, y - 5) && !m.solidPx(x + 4, y - 5) && !m.solidPx(x - 4, y) && !m.solidPx(x + 4, y);
  // đạn và tầm nhìn bị chặn bởi cây và đá (nước không chặn)
  m.blocksShot = (px, py) => { const t = m.tileAt(Math.floor(px / T), Math.floor(py / T)); return t === TREE || t === ROCK; };
  m.lineOfSight = (x0, y0, x1, y1) => {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) { const k = i / n; if (m.blocksShot(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + 6)) return false; }
    return true;
  };
  return m;
}

export function makeHubMap() {
  const { MW, MH, SEED } = HUB;
  return makeMap(MW, MH, SEED, 'hub', (x, y) => {
    const d = Math.hypot(x + 0.5 - MW / 2, y + 0.5 - MH / 2);
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) return TREE;
    if (d < 4.5) return STONE;
    if (d < 8) return GRASS;
    if (noise(x / 8, y / 8, 1, SEED) < 0.3) return WATER;
    if (hash(x, y, 2, SEED) < (noise(x / 6, y / 6, 3, SEED) > 0.55 ? 0.3 : 0.04)) return TREE;
    if (hash(x, y, 4, SEED) < 0.015) return ROCK;
    return GRASS;
  });
}

// Đấu trường bí cảnh: rộng, thưa vật cản để dễ né; viền cây; giữa là bệ đá
export function makeArenaMap(w, h, seed) {
  return makeMap(w, h, seed, 'arena', (x, y) => {
    const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) return TREE;
    if (x === 1 || y === 1 || x === w - 2 || y === h - 2) return hash(x, y, 7, seed) < 0.6 ? TREE : GRASS;
    if (d < 3.5) return STONE;
    if (d < 7) return GRASS;
    if (noise(x / 7, y / 7, 1, seed) < 0.18) return WATER;
    if (hash(x, y, 2, seed) < (noise(x / 5, y / 5, 3, seed) > 0.62 ? 0.16 : 0.012)) return TREE;
    if (hash(x, y, 4, seed) < 0.012) return ROCK;
    return GRASS;
  });
}
