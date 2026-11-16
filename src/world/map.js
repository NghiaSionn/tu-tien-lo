// Bản đồ: động phủ (giống hệt v0.1) và đấu trường bí cảnh. Thuần logic, không đụng DOM.
import { TILE as T, HUB } from '../core/config.js';
import { hash, noise } from '../core/rng.js';
import { SECT, THEM } from '../data/sect_layout.js';
import { PLAZA } from '../data/sect_plaza.js';
import { NHA } from '../data/sect_nha.js';
import { generateDungeon } from './rooms.js';

export const GRASS = 0, WATER = 1, STONE = 2, TREE = 3, ROCK = 4;
export const BUILDING = 5, FENCE = 6, DIRT = 7, CLIFF = 8, CLOUD = 9, FALL = 10;   // M8 (15/11): vách núi rìa đảo, mây ngoài đảo (đặc)   // M8-02: nền công trình (đặc), hàng rào (đặc), sân đất (đi được)

function makeMap(w, h, seed, kind, gen) {
  const tiles = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[y * w + x] = gen(x, y);
  const m = { w, h, seed, kind, tiles, pw: w * T, ph: h * T, cx: w / 2 * T, cy: h / 2 * T };
  m.tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= w || ty >= h) ? TREE : tiles[ty * w + tx];
  m.solidTile = (tx, ty) => { const t = m.tileAt(tx, ty); return t === WATER || t === TREE || t === ROCK || t === BUILDING || t === FENCE || t === CLIFF || t === CLOUD || t === FALL; };
  m.solidPx = (px, py) => m.solidTile(Math.floor(px / T), Math.floor(py / T));
  // x, y là vị trí bàn chân; hộp va chạm nhỏ quanh chân
  m.canStand = (x, y) => Number.isFinite(x) && Number.isFinite(y) &&
    !m.solidPx(x - 4, y - 5) && !m.solidPx(x + 4, y - 5) && !m.solidPx(x - 4, y) && !m.solidPx(x + 4, y);
  // đạn và tầm nhìn bị chặn bởi cây và đá (nước không chặn)
  m.blocksShot = (px, py) => { const t = m.tileAt(Math.floor(px / T), Math.floor(py / T)); return t === TREE || t === ROCK || t === BUILDING || t === FENCE || t === CLIFF; };
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
  const cx = S.MW ? S.MW / 2 - S.PADL : S.W / 2, cy = S.MH ? S.MH / 2 - S.PADT : S.H / 2;   // tâm bệ trong khung
  if (S.ROWS) {   // M8 (15/11): lưới bố cục theo concept
    const MAPC = { '.': GRASS, '=': STONE, '~': WATER, 'd': DIRT, '^': CLIFF, 'T': TREE, 'B': GRASS, 'P': STONE, 'G': STONE, 'X': CLOUD, 'b': GRASS, 'W': FALL };
    for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) set(x, y, MAPC[S.ROWS[y][x]] ?? GRASS);
    for (let x = 0; x < S.W; x++) for (const y of [0, S.H - 1]) if (g[y * S.W + x] === GRASS) set(x, y, TREE);   // mép khung kín
    for (let y = 0; y < S.H; y++) for (const x of [0, S.W - 1]) if (g[y * S.W + x] === GRASS) set(x, y, TREE);
  }
  if (S.STREAM) for (let y = S.STREAM.y; y < S.STREAM.y + S.STREAM.h; y++) for (let x = 0; x < S.W; x++) set(x, y, x >= S.STREAM.bridge[0] && x <= S.STREAM.bridge[1] ? STONE : WATER);
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
  if (P.ring) {   // (16/11) Chuồng Linh Thú bo tròn: rào theo elip (ô có đường elip đi qua = rào), trong = cỏ, chừa cổng
    const { c: [ecx, ecy], rx, ry, gate: [gx, gy] } = P.ring, dd = (x, y) => Math.hypot((x - ecx) / rx, (y - ecy) / ry);
    for (let y = Math.floor(ecy - ry) - 1; y <= ecy + ry + 1; y++) for (let x = Math.floor(ecx - rx) - 1; x <= ecx + rx + 1; x++) {
      const ds = [dd(x, y), dd(x + 1, y), dd(x, y + 1), dd(x + 1, y + 1)], lo = Math.min(...ds), hi = Math.max(...ds);
      if (hi < 1) set(x, y, GRASS);
      else if (lo < 1) set(x, y, Math.hypot(x + 0.5 - gx, y + 0.5 - gy) < 1.3 ? GRASS : FENCE);
    }
  } else for (let y = P.y; y < P.y + P.h; y++) for (let x = P.x; x < P.x + P.w; x++) {
    const edge = x === P.x || y === P.y || x === P.x + P.w - 1 || y === P.y + P.h - 1;
    const gate = y === P.y && x >= P.gate[0] && x <= P.gate[1];
    set(x, y, edge && !gate ? FENCE : GRASS);   // (16/11) chuồng linh thú: nền cỏ trong rào
  }
  if (P.path) for (let i = 1; i < P.path.length; i++) {   // (16/11) lối đá trong chuồng linh thú, rộng 2 ô
    const [x0, y0] = P.path[i - 1], [x1, y1] = P.path[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
    for (let k = 0; k <= n; k++) { const px = x0 + (x1 - x0) * k / n, py = y0 + (y1 - y0) * k / n;
      for (let yy = Math.floor(py - 1); yy < py + 1; yy++) for (let xx = Math.floor(px - 1); xx < px + 1; xx++) if (g[yy * S.W + xx] !== FENCE) set(xx, yy, STONE); }
  }
  for (const b of S.BUILDINGS) { if (b.nha) continue; const r = solidRect(b.foot, b.base); for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) set(x, y, BUILDING); }
  for (const [, x, y, sd] of S.PROPS) if (sd) block(solidRect([x, y], sd));
  if (!S.ROWS) {
    for (let x = 0; x < S.W; x++) { set(x, 0, TREE); set(x, S.H - 1, TREE); }
    for (let y = 0; y < S.H; y++) { set(0, y, TREE); set(S.W - 1, y, TREE); }
  }
  return { tiles: g, solid };
}

export function makeSectMap(S = SECT) {
  const { SEED } = HUB, PAD = S.PAD ?? 10, MW = S.MW || S.W + 2 * PAD, MH = S.MH || S.H + 2 * PAD;
  const ox = S.PADL ?? PAD, oy = S.PADT ?? PAD, { tiles: grid, solid } = buildSectGrid(S);
  const m = makeMap(MW, MH, SEED, 'hub', (x, y) => {
    const lx = x - ox, ly = y - oy;
    if (lx >= 0 && ly >= 0 && lx < S.W && ly < S.H) return grid[ly * S.W + lx];
    if (S.ROWS && ly >= S.H && lx >= 0 && lx < S.W && grid[(S.H - 1) * S.W + lx] === FALL) return FALL;
    if (S.ROWS && ly < 0 && lx >= 0 && lx < S.W && grid[lx] === FALL) return FALL;   // thác đổ từ trên cao (qua mép trên bản đồ)   // (17/11) thác đổ tiếp xuống qua mép dưới bản đồ (chạy qua camera)
    if (S.ROWS) return CLOUD;   // ngoài khung: biển mây
    if (x === 0 || y === 0 || x === MW - 1 || y === MH - 1) return TREE;
    if (noise(x / 8, y / 8, 1, SEED) < 0.3) return WATER;
    return hash(x, y, 2, SEED) < 0.35 ? TREE : GRASS;   // rừng dày ngoài tông môn
  });
  if (S.ROWS) { const inner = m.tileAt; m.tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? CLOUD : inner(tx, ty); }   // (16/11) ngoài mép bản đồ là mây (không vẽ cây rừng tràn vào mép dưới)
  const tileSolid = m.solidTile;
  const base = (tx, ty) => { const lx = tx - ox, ly = ty - oy; return tileSolid(tx, ty) || (lx >= 0 && ly >= 0 && lx < S.W && ly < S.H && solid[ly * S.W + lx] === 1); };
  // bệ pháp đài: lưới ô (thô, cho test/BFS) + lưới mịn PLAZA.cell px (di chuyển bám sát hình: lan can bắc chỉ chặn ở chân, vách nam chặn cả khối)
  const ctx = MW / 2, cty = MH / 2, P0 = PLAZA, cell = P0.cell;
  const fx0 = Math.round(m.cx - P0.anchor[0]) - (P0.pad || 0), fy0 = Math.round(m.cy - P0.anchor[1]) - (P0.pad || 0), fW = P0.fine[0].length * cell, fH = P0.fine.length * cell;
  const plazaTile = (tx, ty) => { const r = P0.rows[ty - cty - P0.y0]; return r ? r[tx - ctx - P0.x0] : undefined; };
  m.solidTile = (tx, ty) => base(tx, ty) || plazaTile(tx, ty) === '#';
  // thềm công trình: trong khung thềm chỉ mặt thềm và cột bậc đi được, còn lại (vách, gờ, trụ góc) đặc
  const inR = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  const themSolid = (x, y) => { for (const b of m.sect.buildings) { const t = b.them; if (!t) continue; const lx = x - t.x, ly = y - t.y;
    if (lx >= 0 && ly >= 0 && lx < t.w && ly < t.h) return !(inR(lx, ly, t.inner) || inR(lx, ly, t.stair)); } return false; };
  const nhaSolid = (x, y) => { for (const b of m.sect.nhaAll) { const n = b.nha; if (!n) continue; const fx = x - n.x + n.pad, fy = y - n.y + n.pad;
    if (fx >= 0 && fy >= 0 && fy < n.fine.length * n.cell && fx < n.fine[0].length * n.cell) return n.fine[Math.floor(fy / n.cell)][Math.floor(fx / n.cell)] === '#'; } return false; };
  m.solidPx = (x, y) => {
    if (m.sect && (themSolid(x, y) || nhaSolid(x, y))) return true;
    const tx = Math.floor(x / T), ty = Math.floor(y / T), fx = x - fx0, fy = y - fy0;
    if (fx >= 0 && fy >= 0 && fx < fW && fy < fH) return P0.fine[Math.floor(fy / cell)][Math.floor(fx / cell)] === '#' || base(tx, ty);
    return m.solidTile(tx, ty);
  };
  // vùng bậc thang của bệ (mẹo cầu thang 2D): trả {kx, slow} nếu (x, y) nằm trên bậc
  const sx0 = fx0 + (P0.pad || 0), sy0 = fy0 + (P0.pad || 0);
  m.stairAt = (x, y) => { for (const z of P0.stairs || []) { const [a, b, c, d] = z.r; if (x >= sx0 + a && x <= sx0 + c && y >= sy0 + b && y <= sy0 + d) return { kx: z.kx, upx: z.upx || 0, upy: z.upy || 0, slow: P0.stairSlow || 1 }; } return null; };
  const px = ([x, y]) => ({ x: (ox + x) * T, y: (oy + y) * T });
  m.sect = {
    ox, oy,
    buildings: S.BUILDINGS.map(b => {
      const r = b.nha ? null : solidRect(b.foot, b.base);
      if (b.nha && NHA[b.nha]) {   // nhà lớn đi vào được: đặt theo giữa đáy bậc; E ở đồ vật chính bên trong
        const N = NHA[b.nha], at = px(b.at), x = Math.round(at.x - N.foot[0]), y = Math.round(at.y - N.foot[1]);
        const nha = { id: b.nha, x, y, ...N };
        return { ...b, px: x, py: y, pw: N.w, ph: N.h, footPx: at, doorPx: { x: x + N.interact[0], y: y + N.interact[1] }, them: null, nha };
      }
      const fp = px(b.foot), th = b.them && THEM[b.them];
      // có thềm: cửa = giữa bậc thềm (người chơi leo bậc tới công trình)
      const door = th ? { x: fp.x, y: fp.y + Math.round((th.stair[1] + th.stair[3]) / 2) - th.foot } : px([b.foot[0], b.foot[1] + 0.7]);
      const them = th ? { kind: b.them, x: Math.round(fp.x - th.w / 2), y: fp.y - th.foot, ...th } : null;
      return { ...b, px: (ox + r.x0) * T, py: (oy + r.y0) * T, pw: b.base[0] * T, ph: b.base[1] * T, footPx: fp, doorPx: door, them };
    }),
    pen: { ...S.PEN, px: (ox + S.PEN.x) * T, py: (oy + S.PEN.y) * T, pw: S.PEN.w * T, ph: S.PEN.h * T, doorPx: px(S.PEN.door) },
    portal: S.PORTAL ? px(S.PORTAL) : null, bia: px(S.BIA),
    props: S.PROPS.map(([s, x, y, sd, flat]) => ({ s, ...px([x, y]), flat: !!flat })),
  };
  // cổng bí cảnh (nhà lớn riêng): chỗ đứng bấm E = interact, tâm xoáy = ring
  m.sect.gate = null;
  if (S.GATE && NHA[S.GATE.nha]) {
    const N = NHA[S.GATE.nha], at = px(S.GATE.at), x = Math.round(at.x - N.foot[0]), y = Math.round(at.y - N.foot[1]);
    m.sect.gate = { id: 'cong_bi_canh', nha: { id: S.GATE.nha, x, y, ...N }, doorPx: { x: x + N.interact[0], y: y + N.interact[1] }, ring: { x: x + N.ring[0], y: y + N.ring[1] } };
    m.sect.portal = m.sect.gate.doorPx;
  }
  m.sect.nhaAll = m.sect.gate ? [...m.sect.buildings, m.sect.gate] : m.sect.buildings;
  // hàng rào Luyện Võ Trường: sprite hang_rao dọc mép bắc/nam (bỏ chỗ cổng) + cổng rào; mép đông/tây vẽ cọc rào theo ô
  const P = S.PEN;
  if (P.ring) {   // rào bo tròn: trụ rào cách đều trên elip (px), render nối thanh gỗ giữa các trụ; cổng mái ngói + trụ cờ
    const { c: [ecx, ecy], rx, ry, gate: [gx, gy] } = P.ring, posts = [];
    const N = Math.round(2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2) * T / 22);
    for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI, x = ecx + rx * Math.cos(a), y = ecy + ry * Math.sin(a);
      posts.push({ x: (ox + x) * T, y: (oy + y) * T, gate: Math.hypot(x - gx, y - gy) < 1.5 }); }
    m.sect.pen.ring = { ...P.ring, posts };
    for (const a of P.ring.flags) m.sect.props.push({ s: 'tru_co', ...px([ecx + rx * Math.cos(a), ecy + ry * Math.sin(a) + 0.4]), flat: false });
    m.sect.props.push({ s: 'cong_chuong', ...px([gx, gy + 0.6]), flat: false });
    return m;
  }
  if (P.art) {   // (16/11) Chuồng Linh Thú: rào/cổng/trụ cờ ChatGPT vẽ (sprites/tm_chuong) — đoạn rào ngang nối tiếp theo px, trụ dọc mỗi 2 ô
    const seg = P.art.seg, X0 = P.x * T, X1 = (P.x + P.w) * T, gx0 = P.gate[0] * T, gx1 = (P.gate[1] + 1) * T;
    const run = (a, b, fy) => { for (let x = a; x < b - 4; x += seg) m.sect.props.push({ s: 'rao_ngang', x: Math.min(x + seg / 2, b - seg / 2), y: fy, flat: false }); };
    const fyN = (oy + P.y + 1) * T, fyS = (oy + P.y + P.h) * T, ox16 = ox * T;
    run(ox16 + X0 + 6, ox16 + gx0, fyN); run(ox16 + gx1, ox16 + X1 - 6, fyN); run(ox16 + X0 + 6, ox16 + X1 - 6, fyS);
    for (let y = P.y + 2; y < P.y + P.h - 1; y += 2) for (const x of [P.x, P.x + P.w - 1]) m.sect.props.push({ s: 'tru_rao', ...px([x + 0.5, y + 1]), flat: false });
    for (const [x, y] of [[P.x, P.y], [P.x + P.w - 1, P.y], [P.x, P.y + P.h - 1], [P.x + P.w - 1, P.y + P.h - 1]]) m.sect.props.push({ s: 'tru_co', ...px([x + 0.5, y + 1]), flat: false });
    m.sect.props.push({ s: 'cong_chuong', ...px([(P.gate[0] + P.gate[1] + 1) / 2, P.y + 1]), flat: false });
    return m;
  }
  for (const ey of [P.y, P.y + P.h - 1]) for (let x = P.x; x < P.x + P.w - 1; x += 2) {
    if (ey === P.y && x + 1 >= P.gate[0] && x <= P.gate[1]) continue;
    m.sect.props.push({ s: 'hang_rao', ...px([x + 1, ey + 1]), flat: false });
  }
  m.sect.props.push({ s: 'cong_rao', ...px([(P.gate[0] + P.gate[1] + 1) / 2, P.y + 1]), flat: false });
  return m;
}

// Đấu trường bí cảnh: rộng, thưa vật cản để dễ né; viền cây; giữa là bệ đá
// M9-B: bí cảnh nhiều phòng — khắc sơ đồ (world/rooms.js) ra lưới ô: phòng + hành lang là cỏ, còn lại là rừng.
// Rừng sâu (cách nền đi được > 3 ô) đánh dấu map.deep để render tô tán rừng tối thay vì vẽ từng cây (đỡ nặng).
// map.blocked: tập ô cửa đang phong ấn (đặc như cây) — director phòng bật/tắt.
export function makeRoomsMap(seed) {
  const dg = generateDungeon(seed), W = dg.w, H = dg.h, g = new Uint8Array(W * H).fill(TREE);
  const carve = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y * W + x] = GRASS; };
  for (const r of dg.rooms) carve(r.x0, r.y0, r.x1, r.y1);
  for (const c of dg.corridors) carve(c.x0, c.y0, c.x1, c.y1);
  // (17/11) phòng tự nhiên hơn: bo 4 góc, mép tường lồi lõm (cây mọc lấn vào), cụm cây/đá/ao nhỏ ở 4 góc phần tư.
  // Luôn chừa dải lối đi ngang/dọc qua tâm phòng (thẳng các cửa) — `lane`.
  const set = (x, y, t) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) g[y * W + x] = t; };
  const H2 = (a, b, c) => hash(a, b, c, seed), pillars = [], decor = [];
  for (const r of dg.rooms) {
    const lane = (x, y) => Math.abs(x + 0.5 - (r.cx + 0.5)) < 4 || Math.abs(y + 0.5 - (r.cy + 0.5)) < 4;
    const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, R0 = r.type === 'boss' || r.type === 'mini' ? 7 : 4;
    // bo góc: ô gần góc ngoài cung tròn bán kính R0 -> cây
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      const inX = x < r.x0 + R0 || x > r.x1 - R0, inY = y < r.y0 + R0 || y > r.y1 - R0;
      if (!inX || !inY || lane(x, y)) continue;   // chỉ 4 góc
      const cx = x < r.x0 + R0 ? r.x0 + R0 : r.x1 - R0, cy = y < r.y0 + R0 ? r.y0 + R0 : r.y1 - R0;
      if (Math.hypot(x - cx, y - cy) > R0 - 0.2 - H2(x, y, 66) * 0.8) set(x, y, TREE);
    }
    // mép lồi lõm: cây lấn 1–2 ô dọc tường
    for (let x = r.x0; x <= r.x1; x++) for (const [y, d] of [[r.y0, 1], [r.y1, -1]]) if (!lane(x, y) && H2(x, y, 67) < 0.35) { set(x, y, TREE); if (H2(x, y, 68) < 0.4) set(x, y + d, TREE); }
    for (let y = r.y0; y <= r.y1; y++) for (const [x, d] of [[r.x0, 1], [r.x1, -1]]) if (!lane(x, y) && H2(x, y, 69) < 0.35) { set(x, y, TREE); if (H2(x, y, 70) < 0.4) set(x + d, y, TREE); }
    if (r.type === 'mini') {   // Hang Lang Vương: sân đất nện hình elip; vành ngoài sân là vật trang trí ChatGPT vẽ (decor)
      const ex = (r.cx + 0.5), ey = (r.cy + 0.5), rx = w / 2 - 4, ry = h / 2 - 3;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        if (g[y * W + x] !== GRASS) continue;
        if (((x + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2 < 1) set(x, y, DIRT);
      }
      // vành ngoài: tô-tem, cờ rách, đá cào, gốc cây cào, ổ rơm (vật lớn, chặn ở chân); trong sân: xương, đầu lâu, hố lửa (vật thấp, đi qua được)
      const ring = ['totem_soi', 'co_rach', 'da_cao', 'goc_cay_cao', 'o_rom_soi', 'da_xuong', 'totem_soi', 'co_rach', 'da_cao', 'goc_cay_cao', 'da_soi', 'da_xuong', 'giao_gay', 'da_cao'];
      ring.forEach((n, i) => {
        const a = (i + 0.5) / ring.length * 6.283 + 0.2, x = Math.floor(ex + Math.cos(a) * (rx - 2)), y = Math.floor(ey + Math.sin(a) * (ry - 1.5));   // sát mép trong sân
        if (lane(x, y) || lane(x + 1, y)) return;
        decor.push({ s: n, x: x + 0.5, y: y + 1, solid: [x, y] });
      });
      const floor = ['dau_lau_soi', 'xuong_suon', 'dong_xuong', 'dong_xuong', 'ho_lua', 'dong_xuong', 'giao_gay', 'dong_xuong', 'dau_lau_soi', 'xuong_suon', 'dong_xuong', 'ho_lua', 'dong_xuong', 'da_xuong'];
      floor.forEach((n, i) => {
        const a = (i + H2(r.id, i, 73) * 0.6) / floor.length * 6.283, k = 0.3 + H2(r.id, i, 74) * 0.42, x = Math.floor(ex + Math.cos(a) * rx * k), y = Math.floor(ey + Math.sin(a) * ry * k);
        if (lane(x, y) || Math.hypot(x - ex, y - ey) < 5) return;
        decor.push({ s: n, x: x + 0.5, y: y + 1, solid: n === 'ho_lua' || n === 'xuong_suon' || n === 'dau_lau_soi' ? [x, y] : null });
      });
      continue;
    }
    if (r.type === 'boss') {   // Đàn tế Ma Ảnh Yêu Vương: nền đá hình bát giác, 4 cột đá đối xứng, viền cây dày
      const ex = r.cx + 0.5, ey = r.cy + 0.5, rx = w / 2 - 3, ry = h / 2 - 2;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        if (g[y * W + x] !== GRASS) continue;
        const dx = Math.abs(x + 0.5 - ex) / rx, dy = Math.abs(y + 0.5 - ey) / ry;
        if (Math.max(dx, dy) < 1 && dx + dy < 1.42) set(x, y, STONE);
      }
      // bày đàn tế (ChatGPT vẽ, sprites/pb_yeu): [món, x, y] theo phần bán trục; chừa giữa (pháp trận) + lối cửa
      const place = [
        ['cot_phu_van', -0.55, -0.55], ['cot_phu_van', 0.55, -0.55], ['cot_phu_van', -0.55, 0.62], ['cot_phu_van', 0.55, 0.62],
        ['tuong_ma', -0.86, -0.62], ['tuong_ma', 0.86, -0.62], ['ban_te', -0.3, -0.82], ['ban_te', 0.3, -0.82],
        ['lu_lua_ma', -0.32, -0.5], ['lu_lua_ma', 0.32, -0.5], ['phuon_den', -0.9, 0.3], ['phuon_den', 0.9, 0.3],
        ['chan_nen', -0.72, -0.25], ['chan_nen', 0.72, -0.25], ['chan_nen', -0.72, 0.42], ['chan_nen', 0.72, 0.42], ['chan_nen', -0.3, 0.75], ['chan_nen', 0.3, 0.75],
        ['bia_phu_van', -0.86, 0.75], ['bia_phu_van', 0.86, 0.75], ['tinh_the_ma', -0.45, 0.88], ['tinh_the_ma', 0.62, 0.88],
        ['cot_gay', -0.95, -0.05], ['dong_dau_lau', 0.95, -0.02], ['xich_sat', -0.35, 0.35], ['xich_sat', 0.4, -0.3],
        ['da_ri_khi', -0.18, 0.55], ['da_ri_khi', 0.2, 0.52], ['dong_dau_lau', -0.6, 0.1], ['tinh_the_ma', 0.62, 0.08],
      ];
      const LOW = new Set(['xich_sat', 'da_ri_khi', 'dong_dau_lau']);   // vật thấp: đi qua được
      for (const [n, fx, fy] of place) {
        const x = Math.floor(ex + fx * rx), y = Math.floor(ey + fy * ry);
        if (lane(x, y) || g[y * W + x] !== STONE) continue;
        decor.push({ s: n, x: x + 0.5, y: y + 1, solid: LOW.has(n) ? null : [x, y] });
      }
      continue;
    }
    if (r.type === 'start' || r.type === 'reward' || r.type === 'shrine') continue;
    // phòng chiến đấu/tinh anh: 2–4 cụm (cây 2×2, đá, ao nhỏ 3×2) ở góc phần tư, tránh lối và sát mép
    const n = 2 + Math.floor(H2(r.gx, r.gy, 61) * 3);
    for (let i = 0; i < n; i++) {
      const x = r.x0 + 5 + Math.floor(H2(r.id, i, 62) * (w - 11)), y = r.y0 + 4 + Math.floor(H2(r.id, i, 63) * (h - 9));
      if (lane(x, y) || lane(x + 2, y + 2) || lane(x - 1, y - 1)) continue;
      const kind = H2(r.id, i, 64);
      if (kind < 0.35) { for (let k = 0; k < 4; k++) set(x + (k & 1), y + (k >> 1), TREE); }
      else if (kind < 0.7) { set(x, y, ROCK); if (H2(r.id, i, 65) < 0.6) set(x + 1, y, ROCK); if (H2(r.id, i, 72) < 0.4) set(x, y + 1, ROCK); }
      else { for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 3; xx++) set(x + xx, y + yy, WATER); }
    }
  }
  for (const c of dg.corridors) carve(c.x0, c.y0, c.x1, c.y1);   // hành lang khắc lại sau cùng (không bị cây góc lấp)
  const decoSolid = new Set(decor.filter(d => d.solid).map(d => d.solid[1] * W + d.solid[0]));   // chân vật trang trí chặn đường
  const m = makeMap(W, H, seed, 'arena', (x, y) => g[y * W + x]);
  m.rooms = dg;
  m.decor = decor.map(d => ({ ...d, px: d.x * T, py: d.y * T }));   // M9-B: vật trang trí phòng boss (sprites/pb_*), chân ở (px, py)
  m.pillars = new Map(pillars.map(([x, y]) => [y * W + x, 1]));   // ô trái-trên của cột 2×2
  m.pillarTile = new Set(pillars.flatMap(([x, y]) => [y * W + x, y * W + x + 1, (y + 1) * W + x, (y + 1) * W + x + 1]));
  const st = dg.rooms[dg.start]; m.cx = (st.cx + 0.5) * T; m.cy = (st.cy + 0.5) * T;
  m.deep = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y * W + x] !== TREE) continue;
    let near = false;
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && g[yy * W + xx] !== TREE) { near = true; break; } }
    if (!near) m.deep[y * W + x] = 1;
  }
  // ô trong phòng đi tới được từ tâm phòng (loang 4 hướng, chỉ trong khung phòng) — quái chỉ sinh ở đây (không kẹt trong góc cây/ao kín)
  m.reach = new Uint8Array(W * H);
  const walkable = (x, y) => { const t = g[y * W + x]; return t === GRASS || t === STONE || t === DIRT; };
  for (const r of dg.rooms) {
    const q = [[r.cx, r.cy]]; if (!walkable(r.cx, r.cy)) continue; m.reach[r.cy * W + r.cx] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
      if (nx < r.x0 || ny < r.y0 || nx > r.x1 || ny > r.y1 || m.reach[ny * W + nx] || !walkable(nx, ny)) continue; m.reach[ny * W + nx] = 1; q.push([nx, ny]); } }
  }
  m.blocked = new Set();
  const solid0 = m.solidTile;
  m.solidTile = (tx, ty) => solid0(tx, ty) || (m.blocked.size > 0 && m.blocked.has(ty * W + tx)) || decoSolid.has(ty * W + tx);
  return m;
}

export function makeArenaMap(w, h, seed) {
  // (17/11) hồ tròn trịa (bỏ mũi nước 1 ô / lấp vịnh hẹp) + cây/đá cách mép hồ ≥ 2 ô -> bờ hồ vẽ được bằng tileset bờ/góc của sảnh
  const g = new Uint8Array(w * h), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? GRASS : g[y * w + x];
  const center = (x, y) => Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) < 7;
  // hồ = 4–6 cụm, mỗi cụm 2–3 hình elip chồng nhau (bờ cong tròn, ít bậc thang), tránh vùng giữa
  const nL = 4 + Math.floor(hash(1, 2, 90, seed) * 3);
  for (let L = 0; L < nL; L++) {
    let cx = 0, cy = 0;
    for (let k = 0; k < 20; k++) { cx = 8 + hash(L, k, 91, seed) * (w - 16); cy = 8 + hash(L, k, 92, seed) * (h - 16); if (Math.hypot(cx - w / 2, cy - h / 2) > 19) break; }   // ngoài vòng sinh quái quanh tâm (RING_R ~15 ô)
    const parts = 2 + Math.floor(hash(L, 0, 93, seed) * 2);
    for (let q = 0; q < parts; q++) {
      const ex = cx + (hash(L, q, 94, seed) - 0.5) * 7, ey = cy + (hash(L, q, 95, seed) - 0.5) * 5, rx = 3.5 + hash(L, q, 96, seed) * 3.5, ry = 2.5 + hash(L, q, 97, seed) * 2.5;
      for (let y = Math.floor(ey - ry - 1); y <= ey + ry + 1; y++) for (let x = Math.floor(ex - rx - 1); x <= ex + rx + 1; x++)
        if (x > 3 && y > 3 && x < w - 4 && y < h - 4 && !center(x, y) && ((x + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2 < 1) g[y * w + x] = WATER;
    }
  }
  for (let it = 0; it < 4; it++) {   // làm mượt: ô nước ít láng giềng nước -> cỏ; ô cỏ bị nước bao 3 phía -> nước
    const n = new Uint8Array(g);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let c4 = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(x + dx, y + dy) === WATER) c4++;
      if (g[y * w + x] === WATER && c4 <= 1) n[y * w + x] = GRASS;
      else if (g[y * w + x] !== WATER && c4 >= 3 && !center(x, y)) n[y * w + x] = WATER;
    }
    g.set(n);
  }
  const nearWater = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (at(x + dx, y + dy) === WATER) return true; return false; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y * w + x] === WATER) continue;
    const d = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
    let t = GRASS;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) t = TREE;
    else if (x === 1 || y === 1 || x === w - 2 || y === h - 2) t = hash(x, y, 7, seed) < 0.6 ? TREE : GRASS;
    else if (d < 3.5) t = STONE;
    else if (d < 7 || nearWater(x, y, 2)) t = GRASS;   // không mọc cây/đá sát hồ
    else if (hash(x, y, 2, seed) < (noise(x / 5, y / 5, 3, seed) > 0.62 ? 0.16 : 0.012)) t = TREE;
    else if (hash(x, y, 4, seed) < 0.012) t = ROCK;
    g[y * w + x] = t;
  }
  return makeMap(w, h, seed, 'arena', (x, y) => g[y * w + x]);
}
