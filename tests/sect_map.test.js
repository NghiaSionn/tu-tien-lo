// M8: bản đồ tông môn (rộng gấp 2, sprite tm_*) — đi tới được mọi khu, không ô kẹt, quảng trường đủ cho thiên kiếp, map cũ không đổi
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHubMap, makeSectMap, TREE } from '../src/world/map.js';
import { HUB, TRIBULATION, PLAYER, TILE as T } from '../src/core/config.js';
import { SECT } from '../src/data/sect_layout.js';


test('tắt cờ: động phủ cũ y hệt trước M8 (dấu vân tay ô)', () => {
  const m = makeHubMap();
  let h = 2166136261; for (const t of m.tiles) { h ^= t; h = Math.imul(h, 16777619) >>> 0; }
  assert.equal(h, 1741762572);
  assert.equal(m.sect, undefined);
});

const m = makeSectMap(), S = m.sect;
const spawn = { x: m.cx + HUB.RESPAWN.dx, y: m.cy + HUB.RESPAWN.dy };
// loang theo đúng hàm đứng được của game (m.canStand), bước G px — bệ pháp đài va chạm theo lưới mịn 4 px nên không loang theo ô 16 px
const G = 4, GW = Math.ceil(m.pw / G), GH = Math.ceil(m.ph / G);
const node = p => Math.floor(p.y / G) * GW + Math.floor(p.x / G);
function bfs(from, blocked = () => false) {
  const dist = new Int32Array(GW * GH).fill(-1), q = [node(from)]; dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const k = q[i], x = k % GW, y = (k / GW) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, nk = ny * GW + nx;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || dist[nk] >= 0) continue;
      const px = nx * G + G / 2, py = ny * G + G / 2;
      if (!m.canStand(px, py) || blocked(px, py)) continue;
      dist[nk] = dist[k] + 1; q.push(nk);
    }
  }
  return dist;
}
const reach = bfs(spawn);
// tới được điểm p: một nút trong vòng 8 px quanh p đã loang tới
const reachable = p => { for (let dy = -8; dy <= 8; dy += G) for (let dx = -8; dx <= 8; dx += G) if (reach[node({ x: p.x + dx, y: p.y + dy })] >= 0) return true; return false; };

test('hồi sinh đứng được; tới được cửa mọi công trình, cổng rào, cổng bí cảnh, bia', () => {
  assert.ok(m.canStand(spawn.x, spawn.y));
  assert.equal(S.buildings.length, 5);
  for (const b of S.buildings) { assert.ok(reachable(b.doorPx), b.id); assert.ok(m.canStand(b.doorPx.x, b.doorPx.y), b.id + ' đứng được ở cửa'); }
  for (const [name, p] of [['cổng rào', S.pen.doorPx], ['cổng bí cảnh', S.portal], ['bia', S.bia]]) { assert.ok(reachable(p), name); assert.ok(m.canStand(p.x, p.y), name); }
  // vào được trong sân Luyện Võ Trường qua cổng rào
  assert.ok(reachable({ x: S.pen.px + S.pen.pw / 2, y: S.pen.py + S.pen.ph / 2 }));
});

test('không có chỗ đứng được nào bị kẹt trong khung tông môn; viền khung kín', () => {
  for (let ly = 0; ly < SECT.H; ly++) for (let lx = 0; lx < SECT.W; lx++) {
    const x = S.ox + lx, y = S.oy + ly, t = m.tileAt(x, y), c = { x: x * T + 8, y: y * T + 8 };
    if (m.canStand(c.x, c.y)) assert.ok(reachable(c), `ô (${lx},${ly}) đứng được nhưng không tới được`);
    if (lx === 0 || ly === 0 || lx === SECT.W - 1 || ly === SECT.H - 1) assert.equal(t, TREE, `viền (${lx},${ly})`);
  }
});

// thiên kiếp giữ người chơi trong vòng ARENA_R - 4 (systems/tribulation.js): cả vòng đó phải đứng được (bệ M8 không chặn né)
test('quảng trường trống cho thiên kiếp (mọi điểm trong vòng giữ người chơi đều đứng được) và công trình là ô đặc', () => {
  for (let a = 0; a < 64; a++) for (const r of [0, 30, 60, TRIBULATION.ARENA_R - 8, TRIBULATION.ARENA_R - 4]) {
    const x = m.cx + Math.cos(a / 64 * 6.283) * r, y = m.cy + Math.sin(a / 64 * 6.283) * r;
    assert.ok(m.canStand(x, y), `thiên kiếp bị chặn tại (${Math.round(x - m.cx)},${Math.round(y - m.cy)})`);
  }
  for (const b of S.buildings) assert.ok(!m.canStand(b.px + b.pw / 2, b.py + b.ph / 2), b.id + ' không đi xuyên');
});

test('rộng gấp 2: đi từ pháp đài tới mỗi khu mất 4–9 s (đường ngắn nhất, PLAYER.SPEED)', () => {
  const dist = bfs({ x: m.cx, y: m.cy });
  const sec = p => { let best = Infinity; for (let dy = -8; dy <= 8; dy += G) for (let dx = -8; dx <= 8; dx += G) { const d = dist[node({ x: p.x + dx, y: p.y + dy })]; if (d >= 0) best = Math.min(best, d); } return best * G / PLAYER.SPEED; };
  for (const b of S.buildings) { const s = sec(b.doorPx); assert.ok(s >= 4 && s <= 9, `${b.id}: ${s.toFixed(1)} s`); }
  assert.ok(sec(S.portal) >= 3.5, 'cổng ' + sec(S.portal));
});

test('bệ pháp đài (sprite): mặt sàn tới được, chỉ lên/xuống qua 4 lối (bắc, bậc nam, cánh đông/tây)', async () => {
  const { PLAZA } = await import('../src/data/sect_plaza.js');
  const cx = Math.floor(m.cx / T), cy = Math.floor(m.cy / T);
  let walkN = 0;
  for (let j = 0; j < PLAZA.rows.length; j++) for (let i = 0; i < PLAZA.rows[j].length; i++) {
    if (PLAZA.rows[j][i] !== '.') continue;
    const c = { x: (cx + PLAZA.x0 + i) * T + 8, y: (cy + PLAZA.y0 + j) * T + 8 };
    if (m.canStand(c.x, c.y)) { walkN++; assert.ok(reachable(c), `mặt sàn (${i},${j}) phải tới được`); }
  }
  assert.ok(walkN > 200, `sàn ${walkN}`);
  // bịt 4 lối (vùng bậc/cánh) thì từ tâm không ra được ngoài khung sprite -> mép bệ kín
  const W = PLAZA.fine[0].length * PLAZA.cell, H = PLAZA.fine.length * PLAZA.cell, x0 = Math.round(m.cx - PLAZA.anchor[0]), y0 = Math.round(m.cy - PLAZA.anchor[1]);
  const exit = (x, y) => (Math.abs(x - m.cx) < 48 && (y < m.cy - 90 || y > m.cy + 92)) || Math.abs(x - m.cx) > 175;
  const d = bfs({ x: m.cx, y: m.cy }, exit);
  for (let k = 0; k < d.length; k++) if (d[k] >= 0) {
    const x = (k % GW) * G, y = ((k / GW) | 0) * G;
    assert.ok(x > x0 && y > y0 && x < x0 + W && y < y0 + H, `mép bệ hở: ra được tới (${x - m.cx},${y - m.cy}) không qua lối`);
  }
});
