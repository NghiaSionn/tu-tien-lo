// Bản đồ: động phủ (giống hệt v0.1) và đấu trường bí cảnh. Thuần logic, không đụng DOM.
import { TILE as T, HUB } from '../core/config.js';
import { hash, noise } from '../core/rng.js';
import { SECT } from '../data/sect_layout.js';

export const GRASS = 0, WATER = 1, STONE = 2, TREE = 3, ROCK = 4;
export const BUILDING = 5, FENCE = 6, DIRT = 7;   // M8-02: nền công trình (đặc), hàng rào (đặc), sân đất (đi được)

function makeMap(w, h, seed, kind, gen) {
  const tiles = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[y * w + x] = gen(x, y);
  const m = { w, h, seed, kind, tiles, pw: w * T, ph: h * T, cx: w / 2 * T, cy: h / 2 * T };
  m.tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= w || ty >= h) ? TREE : tiles[ty * w + tx];
  m.solidPx = (px, py) => { const t = m.tileAt(Math.floor(px / T), Math.floor(py / T)); return t === WATER || t === TREE || t === ROCK || t === BUILDING || t === FENCE; };
  // x, y là vị trí bàn chân; hộp va chạm nhỏ quanh chân
  m.canStand = (x, y) => Number.isFinite(x) && Number.isFinite(y) &&
    !m.solidPx(x - 4, y - 5) && !m.solidPx(x + 4, y - 5) && !m.solidPx(x - 4, y) && !m.solidPx(x + 4, y);
  // đạn và tầm nhìn bị chặn bởi cây và đá (nước không chặn)
  m.blocksShot = (px, py) => { const t = m.tileAt(Math.floor(px / T), Math.floor(py / T)); return t === TREE || t === ROCK || t === BUILDING || t === FENCE; };
  m.lineOfSight = (x0, y0, x1, y1) => {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) { const k = i / n; if (m.blocksShot(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k + 6)) return false; }
    return true;
  };
  return m;
}

function hubTile(x, y) {
  const { MW, MH, SEED } = HUB;
  const d = Math.hypot(x + 0.5 - MW / 2, y + 0.5 - MH / 2);
  if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) return TREE;
  if (d < 4.5) return STONE;
  if (d < 8) return GRASS;
  if (noise(x / 8, y / 8, 1, SEED) < 0.3) return WATER;
  if (hash(x, y, 2, SEED) < (noise(x / 6, y / 6, 3, SEED) > 0.55 ? 0.3 : 0.04)) return TREE;
  if (hash(x, y, 4, SEED) < 0.015) return ROCK;
  return GRASS;
}

export function makeHubMap() {
  const { MW, MH, SEED } = HUB;
  return makeMap(MW, MH, SEED, 'hub', hubTile);
}

// M8-02: sảnh tông môn — ngoài khung giữ rừng động phủ cũ (chỉ để nhìn, không vào được: viền khung là hàng cây kín);
// trong khung dựng cố định từ SECT (data/sect_layout.js). map.sect: vị trí công trình/cổng/bia/rào theo px để game và render dùng.
export function buildSectGrid(S = SECT) {
  const g = new Uint8Array(S.W * S.H).fill(GRASS);
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < S.W && y < S.H) g[y * S.W + x] = t; };
  const cx = S.W / 2, cy = S.H / 2;
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= S.PLAZA_R) set(x, y, STONE);
  for (let y = S.STREAM.y; y < S.STREAM.y + S.STREAM.h; y++) for (let x = 0; x < S.W; x++) set(x, y, x >= S.STREAM.bridge[0] && x <= S.STREAM.bridge[1] ? STONE : WATER);
  const half = S.PATH_W / 2;
  for (const line of S.PATHS) for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1], [x1, y1] = line[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
    for (let k = 0; k <= n; k++) {
      const px = x0 + (x1 - x0) * k / n, py = y0 + (y1 - y0) * k / n;
      for (let yy = Math.floor(py - half); yy < py + half; yy++) for (let xx = Math.floor(px - half); xx < px + half; xx++) set(xx, yy, STONE);
    }
  }
  const P = S.PEN;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const edge = x === P.x || y === P.y || x === P.x + P.w - 1 || y === P.y + P.h - 1;
    const gate = y === P.y && x >= P.gate[0] && x <= P.gate[1];
    set(x, y, edge && !gate ? FENCE : DIRT);
  }
  for (const b of S.BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) set(x, y, BUILDING);
  for (const [x, y] of S.TREES) set(x, y, TREE);
  for (const [x, y] of S.ROCKS) set(x, y, ROCK);
  for (let x = 0; x < S.W; x++) { set(x, 0, TREE); set(x, S.H - 1, TREE); }
  for (let y = 0; y < S.H; y++) { set(0, y, TREE); set(S.W - 1, y, TREE); }
  return g;
}

export function makeSectMap(S = SECT) {
  const { MW, MH, SEED } = HUB;
  const ox = MW / 2 - S.W / 2, oy = MH / 2 - S.H / 2, grid = buildSectGrid(S);
  const m = makeMap(MW, MH, SEED, 'hub', (x, y) => {
    const lx = x - ox, ly = y - oy;
    return lx >= 0 && ly >= 0 && lx < S.W && ly < S.H ? grid[ly * S.W + lx] : hubTile(x, y);
  });
  const px = ([x, y]) => ({ x: (ox + x) * T, y: (oy + y) * T });
  m.sect = {
    ox, oy,
    buildings: S.BUILDINGS.map(b => ({ ...b, px: (ox + b.x) * T, py: (oy + b.y) * T, pw: b.w * T, ph: b.h * T, doorPx: px(b.door) })),
    pen: { ...S.PEN, px: (ox + S.PEN.x) * T, py: (oy + S.PEN.y) * T, pw: S.PEN.w * T, ph: S.PEN.h * T, doorPx: px(S.PEN.door) },
    portal: px(S.PORTAL), bia: px(S.BIA),
  };
  return m;
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
