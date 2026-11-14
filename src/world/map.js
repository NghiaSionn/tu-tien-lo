// Bản đồ: động phủ (giống hệt v0.1) và đấu trường bí cảnh. Thuần logic, không đụng DOM.
import { TILE as T, HUB } from '../core/config.js';
import { hash, noise } from '../core/rng.js';
import { SECT } from '../data/sect_layout.js';
import { PLAZA } from '../data/sect_plaza.js';

export const GRASS = 0, WATER = 1, STONE = 2, TREE = 3, ROCK = 4;
export const BUILDING = 5, FENCE = 6, DIRT = 7;   // M8-02: nền công trình (đặc), hàng rào (đặc), sân đất (đi được)

function makeMap(w, h, seed, kind, gen) {
  const tiles = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[y * w + x] = gen(x, y);
  const m = { w, h, seed, kind, tiles, pw: w * T, ph: h * T, cx: w / 2 * T, cy: h / 2 * T };
  m.tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= w || ty >= h) ? TREE : tiles[ty * w + tx];
  m.solidTile = (tx, ty) => { const t = m.tileAt(tx, ty); return t === WATER || t === TREE || t === ROCK || t === BUILDING || t === FENCE; };
  m.solidPx = (px, py) => m.solidTile(Math.floor(px / T), Math.floor(py / T));
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

// M8: sảnh tông môn — bản đồ riêng = khung SECT + PAD ô rừng động phủ cũ mỗi phía (chỉ để nhìn; viền khung là hàng cây kín).
// Trong khung dựng cố định từ SECT (data/sect_layout.js). Công trình/đồ vật/cây là sprite (sprites/tm_*); phần đặc của chúng
// nằm trong mặt nạ `solid` riêng (ô nền giữ cỏ/đá để vẽ). map.sect: vị trí theo px cho game và render.
const rnd = v => Math.round(v);
function solidRect([fx, fy], [w, h]) { const x0 = rnd(fx - w / 2), y1 = rnd(fy); return { x0, y0: y1 - h, x1: x0 + w, y1 }; }
export function buildSectGrid(S = SECT) {
  const g = new Uint8Array(S.W * S.H).fill(GRASS), solid = new Uint8Array(S.W * S.H);
  const inb = (x, y) => x >= 0 && y >= 0 && x < S.W && y < S.H;
  const set = (x, y, t) => { if (inb(x, y)) g[y * S.W + x] = t; };
  const block = r => { for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) if (inb(x, y)) solid[y * S.W + x] = 1; };
  const cx = S.W / 2, cy = S.H / 2;
  for (let y = S.STREAM.y; y < S.STREAM.y + S.STREAM.h; y++) for (let x = 0; x < S.W; x++) set(x, y, x >= S.STREAM.bridge[0] && x <= S.STREAM.bridge[1] ? STONE : WATER);
  const P0 = S.POND; if (P0) for (let y = P0.y; y < P0.y + P0.h; y++) for (let x = P0.x; x < P0.x + P0.w; x++) set(x, y, WATER);
  const half = S.PATH_W / 2;
  for (const line of S.PATHS) for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1], [x1, y1] = line[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
    for (let k = 0; k <= n; k++) {
      const px = x0 + (x1 - x0) * k / n, py = y0 + (y1 - y0) * k / n;
      for (let yy = Math.floor(py - half); yy < py + half; yy++) for (let xx = Math.floor(px - half); xx < px + half; xx++) {
        if (!(inb(xx, yy) && g[yy * S.W + xx] === WATER)) set(xx, yy, STONE);   // không lấp ao/suối (cầu đá đã là đá)
      }
    }
  }
  // bệ Tụ Linh Pháp Đài (sprite ChatGPT, data/sect_plaza.js sinh từ tools/build_be_phap_dai.py): tâm bệ = tâm khung.
  // Va chạm của bệ nằm ở makeSectMap (lưới mịn 4 px); ở đây chỉ lát đá dưới mặt sàn
  for (let j = 0; j < PLAZA.rows.length; j++) for (let i = 0; i < PLAZA.rows[j].length; i++)
    if (PLAZA.rows[j][i] === '.') set(cx + PLAZA.x0 + i, cy + PLAZA.y0 + j, STONE);
  const P = S.PEN;
  for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const edge = x === P.x || y === P.y || x === P.x + P.w - 1 || y === P.y + P.h - 1;
    const gate = y === P.y && x >= P.gate[0] && x <= P.gate[1];
    set(x, y, edge && !gate ? FENCE : DIRT);
  }
  for (const b of S.BUILDINGS) { const r = solidRect(b.foot, b.base); for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) set(x, y, BUILDING); }
  for (const [, x, y, sd] of S.PROPS) if (sd) block(solidRect([x, y], sd));
  for (let x = 0; x < S.W; x++) { set(x, 0, TREE); set(x, S.H - 1, TREE); }
  for (let y = 0; y < S.H; y++) { set(0, y, TREE); set(S.W - 1, y, TREE); }
  return { tiles: g, solid };
}

export function makeSectMap(S = SECT) {
  const { SEED } = HUB, PAD = S.PAD ?? 10, MW = S.W + 2 * PAD, MH = S.H + 2 * PAD;
  const ox = PAD, oy = PAD, { tiles: grid, solid } = buildSectGrid(S);
  const m = makeMap(MW, MH, SEED, 'hub', (x, y) => {
    const lx = x - ox, ly = y - oy;
    if (lx >= 0 && ly >= 0 && lx < S.W && ly < S.H) return grid[ly * S.W + lx];
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) return TREE;
    if (noise(x / 8, y / 8, 1, SEED) < 0.3) return WATER;
    return hash(x, y, 2, SEED) < 0.35 ? TREE : GRASS;   // rừng dày ngoài tông môn
  });
  const tileSolid = m.solidTile;
  const base = (tx, ty) => { const lx = tx - ox, ly = ty - oy; return tileSolid(tx, ty) || (lx >= 0 && ly >= 0 && lx < S.W && ly < S.H && solid[ly * S.W + lx] === 1); };
  // bệ pháp đài: lưới ô (thô, cho test/BFS) + lưới mịn PLAZA.cell px (di chuyển bám sát hình: lan can bắc chỉ chặn ở chân, vách nam chặn cả khối)
  const ctx = ox + S.W / 2, cty = oy + S.H / 2, P0 = PLAZA, cell = P0.cell;
  const fx0 = Math.round(m.cx - P0.anchor[0]), fy0 = Math.round(m.cy - P0.anchor[1]), fW = P0.fine[0].length * cell, fH = P0.fine.length * cell;
  const plazaTile = (tx, ty) => { const r = P0.rows[ty - cty - P0.y0]; return r ? r[tx - ctx - P0.x0] : undefined; };
  m.solidTile = (tx, ty) => base(tx, ty) || plazaTile(tx, ty) === '#';
  m.solidPx = (x, y) => {
    const tx = Math.floor(x / T), ty = Math.floor(y / T), fx = x - fx0, fy = y - fy0;
    if (fx >= 0 && fy >= 0 && fx < fW && fy < fH) return P0.fine[Math.floor(fy / cell)][Math.floor(fx / cell)] === '#' || base(tx, ty);
    return m.solidTile(tx, ty);
  };
  const px = ([x, y]) => ({ x: (ox + x) * T, y: (oy + y) * T });
  m.sect = {
    ox, oy,
    buildings: S.BUILDINGS.map(b => {
      const r = solidRect(b.foot, b.base);
      return { ...b, px: (ox + r.x0) * T, py: (oy + r.y0) * T, pw: b.base[0] * T, ph: b.base[1] * T, footPx: px(b.foot), doorPx: px([b.foot[0], b.foot[1] + 0.7]) };
    }),
    pen: { ...S.PEN, px: (ox + S.PEN.x) * T, py: (oy + S.PEN.y) * T, pw: S.PEN.w * T, ph: S.PEN.h * T, doorPx: px(S.PEN.door) },
    portal: px(S.PORTAL), bia: px(S.BIA),
    props: S.PROPS.map(([s, x, y, sd, flat]) => ({ s, ...px([x, y]), flat: !!flat })),
  };
  // hàng rào Luyện Võ Trường: sprite hang_rao dọc mép bắc/nam (bỏ chỗ cổng) + cổng rào; mép đông/tây vẽ cọc rào theo ô
  const P = S.PEN;
  for (const ey of [P.y, P.y + P.h - 1]) for (let x = P.x; x < P.x + P.w - 1; x += 2) {
    if (ey === P.y && x + 1 >= P.gate[0] && x <= P.gate[1]) continue;
    m.sect.props.push({ s: 'hang_rao', ...px([x + 1, ey + 1]), flat: false });
  }
  m.sect.props.push({ s: 'cong_rao', ...px([(P.gate[0] + P.gate[1] + 1) / 2, P.y + 1]), flat: false });
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
