// M9-B: sinh sơ đồ bí cảnh nhiều phòng theo seed (kiểu Soul Knight). Thuần logic, không đụng tile/DOM:
// trả về danh sách phòng (ô lưới, hình chữ nhật theo ô gạch, loại, độ sâu) + các cạnh nối. map.js khắc ra lưới ô.
import { ROOMS as R } from '../core/config.js';
import { mulberry32 } from '../core/rng.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Một lần thử: cây phòng mọc ngẫu nhiên từ ô xuất phát
function grow(rng) {
  const [GX, GY] = R.GRID, want = R.COUNT[0] + Math.floor(rng() * (R.COUNT[1] - R.COUNT[0] + 1));
  const start = { gx: Math.floor(rng() * GX), gy: Math.floor(rng() * GY) };
  const rooms = [{ id: 0, ...start }], at = new Map([[start.gx + ',' + start.gy, 0]]), edges = [];
  for (let guard = 0; rooms.length < want && guard < 400; guard++) {
    const a = rooms[Math.floor(rng() * rooms.length)], [dx, dy] = DIRS[Math.floor(rng() * 4)];
    const gx = a.gx + dx, gy = a.gy + dy, k = gx + ',' + gy;
    if (gx < 0 || gy < 0 || gx >= GX || gy >= GY || at.has(k)) continue;
    const r = { id: rooms.length, gx, gy }; rooms.push(r); at.set(k, r.id); edges.push([a.id, r.id]);
  }
  return { rooms, edges, at };
}

function bfs(rooms, edges, from) {
  const nb = rooms.map(() => []);
  for (const [a, b] of edges) { nb[a].push(b); nb[b].push(a); }
  const depth = rooms.map(() => -1), prev = rooms.map(() => -1), q = [from]; depth[from] = 0;
  for (let i = 0; i < q.length; i++) for (const n of nb[q[i]]) if (depth[n] < 0) { depth[n] = depth[q[i]] + 1; prev[n] = q[i]; q.push(n); }
  return { nb, depth, prev };
}

// Sơ đồ hoàn chỉnh: loại phòng + hình chữ nhật (ô gạch, tính cả lề map) + cửa
export function generateDungeon(seed) {
  let g, info;
  for (let k = 0; k < 40; k++) {
    const rng = mulberry32((seed + k * 7919) >>> 0);
    g = grow(rng); info = bfs(g.rooms, g.edges, 0);
    const maxD = Math.max(...info.depth);
    if (g.rooms.length >= R.COUNT[0] && maxD >= R.MIN_BOSS_DEPTH) { g.rng = rng; break; }
    g.rng = rng;
  }
  const { rooms, edges, rng } = g, { nb, depth, prev } = info;
  for (const r of rooms) { r.depth = depth[r.id]; r.nb = nb[r.id]; }
  // boss = phòng sâu nhất (ưu tiên phòng cụt); đường chính = start -> boss
  const leaf = r => r.nb.length === 1;
  const boss = rooms.filter(r => r.id).sort((a, b) => b.depth - a.depth || leaf(b) - leaf(a) || a.id - b.id)[0];
  const main = new Set(); for (let i = boss.id; i >= 0; i = prev[i]) main.add(i);
  for (const r of rooms) r.type = 'combat';
  rooms[0].type = 'start'; boss.type = 'boss';
  const onMain = rooms.filter(r => main.has(r.id) && r.type === 'combat').sort((a, b) => a.depth - b.depth);
  if (onMain.length) onMain[Math.floor((onMain.length - 1) / 2)].type = 'mini';   // Lang Vương ở giữa đường chính
  // phòng nhánh (ngoài đường chính): ưu tiên phòng cụt -> thưởng, Linh Mạch, tinh anh
  const side = rooms.filter(r => !main.has(r.id) && r.type === 'combat').sort((a, b) => leaf(b) - leaf(a) || b.depth - a.depth || a.id - b.id);
  const special = ['reward', 'shrine', 'elite'];
  for (let i = 0; i < side.length && i < special.length; i++) side[i].type = special[i];
  for (const t of special) if (!rooms.some(r => r.type === t)) { const c = rooms.find(r => r.type === 'combat' && !main.has(r.id)) || rooms.find(r => r.type === 'combat'); if (c) c.type = t; }
  // hình chữ nhật mỗi phòng: kích thước ngẫu nhiên, căn giữa ô lưới (ô cùng hàng/cột thẳng tâm -> hành lang thẳng)
  const [CW, CH] = R.CELL, PAD = 2;
  for (const r of rooms) {
    const big = r.type === 'boss' || r.type === 'mini';
    const w = big ? R.ROOM_W[1] : R.ROOM_W[0] + Math.floor(rng() * (R.ROOM_W[1] - R.ROOM_W[0] + 1));
    const h = big ? R.ROOM_H[1] : R.ROOM_H[0] + Math.floor(rng() * (R.ROOM_H[1] - R.ROOM_H[0] + 1));
    const cx = PAD + r.gx * CW + Math.floor(CW / 2), cy = PAD + r.gy * CH + Math.floor(CH / 2);
    r.cx = cx; r.cy = cy; r.x0 = cx - Math.floor(w / 2); r.y0 = cy - Math.floor(h / 2); r.x1 = r.x0 + w - 1; r.y1 = r.y0 + h - 1;
    r.doors = [];   // ô gạch hành lang sát mép phòng: bị phong ấn khi phòng đang đánh
  }
  const C = R.CORRIDOR, half = Math.floor(C / 2);
  const corridors = [];
  for (const [ia, ib] of edges) {
    const a = rooms[ia], b = rooms[ib];
    if (a.gy === b.gy) {   // ngang
      const [l, r] = a.cx < b.cx ? [a, b] : [b, a], y0 = a.cy - half, y1 = y0 + C - 1;
      corridors.push({ x0: l.x1 + 1, x1: r.x0 - 1, y0, y1, a: l.id, b: r.id });
      for (let y = y0; y <= y1; y++) { l.doors.push([l.x1 + 1, y]); r.doors.push([r.x0 - 1, y]); }
    } else {               // dọc
      const [t, d] = a.cy < b.cy ? [a, b] : [b, a], x0 = a.cx - half, x1 = x0 + C - 1;
      corridors.push({ x0, x1, y0: t.y1 + 1, y1: d.y0 - 1, a: t.id, b: d.id });
      for (let x = x0; x <= x1; x++) { t.doors.push([x, t.y1 + 1]); d.doors.push([x, d.y0 - 1]); }
    }
  }
  const W = PAD * 2 + R.GRID[0] * CW, H = PAD * 2 + R.GRID[1] * CH;
  return { seed, w: W, h: H, rooms, edges, corridors, start: 0, boss: boss.id };
}

// Phòng chứa điểm (ô gạch), lùi vào trong `inset` ô; -1 nếu ở hành lang/ngoài
export function roomAt(dg, tx, ty, inset = 0) {
  for (const r of dg.rooms) if (tx >= r.x0 + inset && tx <= r.x1 - inset && ty >= r.y0 + inset && ty <= r.y1 - inset) return r.id;
  return -1;
}
