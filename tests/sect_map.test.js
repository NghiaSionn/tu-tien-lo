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
const solidAt = (x, y) => m.solidTile(x, y);
const spawn = { x: m.cx + HUB.RESPAWN.dx, y: m.cy + HUB.RESPAWN.dy };
// flood-fill theo ô đi được, bắt đầu từ ô hồi sinh
const reach = new Uint8Array(m.w * m.h);
{
  const q = [[Math.floor(spawn.x / T), Math.floor(spawn.y / T)]];
  reach[q[0][1] * m.w + q[0][0]] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || reach[ny * m.w + nx] || solidAt(nx, ny)) continue;
      reach[ny * m.w + nx] = 1; q.push([nx, ny]);
    }
  }
}
const reachable = p => reach[Math.floor(p.y / T) * m.w + Math.floor(p.x / T)] === 1;

test('hồi sinh đứng được; tới được cửa mọi công trình, cổng rào, cổng bí cảnh, bia', () => {
  assert.ok(m.canStand(spawn.x, spawn.y));
  assert.equal(S.buildings.length, 5);
  for (const b of S.buildings) { assert.ok(reachable(b.doorPx), b.id); assert.ok(m.canStand(b.doorPx.x, b.doorPx.y), b.id + ' đứng được ở cửa'); }
  for (const [name, p] of [['cổng rào', S.pen.doorPx], ['cổng bí cảnh', S.portal], ['bia', S.bia]]) { assert.ok(reachable(p), name); assert.ok(m.canStand(p.x, p.y), name); }
  // vào được trong sân Luyện Võ Trường qua cổng rào
  assert.ok(reachable({ x: S.pen.px + S.pen.pw / 2, y: S.pen.py + S.pen.ph / 2 }));
});

test('không có ô đi được nào bị kẹt trong khung tông môn; viền khung kín', () => {
  for (let ly = 0; ly < SECT.H; ly++) for (let lx = 0; lx < SECT.W; lx++) {
    const x = S.ox + lx, y = S.oy + ly, t = m.tileAt(x, y);
    if (!solidAt(x, y)) assert.ok(reach[y * m.w + x], `ô (${lx},${ly}) đi được nhưng không tới được`);
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

test('rộng gấp 2: đi từ pháp đài tới mỗi khu mất ≥ 4 s (đường ngắn nhất theo ô, PLAYER.SPEED)', () => {
  // BFS từ tâm; khoảng cách ô × 16 / tốc độ
  const dist = new Int32Array(m.w * m.h).fill(-1), q = [[Math.floor(m.cx / T), Math.floor(m.cy / T)]];
  dist[q[0][1] * m.w + q[0][0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = ny * m.w + nx;
      if (dist[k] >= 0 || solidAt(nx, ny)) continue;
      dist[k] = dist[y * m.w + x] + 1; q.push([nx, ny]);
    }
  }
  const sec = p => dist[Math.floor(p.y / T) * m.w + Math.floor(p.x / T)] * T / PLAYER.SPEED;
  const far = S.buildings.map(b => sec(b.doorPx));
  for (const [i, s] of far.entries()) assert.ok(s >= 4 && s <= 9, `${S.buildings[i].id}: ${s.toFixed(1)} s`);
  assert.ok(sec(S.portal) >= 3.5, 'cổng ' + sec(S.portal));
});

test('bệ pháp đài (sprite): mặt sàn đi được, lan can/vách đặc, lên được qua 4 lối (bắc, bậc nam, cánh đông/tây)', async () => {
  const { PLAZA } = await import('../src/data/sect_plaza.js');
  const cx = Math.floor(m.cx / T), cy = Math.floor(m.cy / T);
  const cell = (i, j) => PLAZA.rows[j][i];
  let solidN = 0, walkN = 0;
  for (let j = 0; j < PLAZA.rows.length; j++) for (let i = 0; i < PLAZA.rows[j].length; i++) {
    const x = cx + PLAZA.x0 + i, y = cy + PLAZA.y0 + j;
    if (cell(i, j) === '#') { solidN++; assert.ok(solidAt(x, y), `ô bệ (${i},${j}) phải đặc`); }
    if (cell(i, j) === '.') { walkN++; assert.ok(!solidAt(x, y) && reach[y * m.w + x], `mặt sàn (${i},${j}) phải tới được`); }
  }
  assert.ok(solidN > 150 && walkN > 300, `đặc ${solidN}, sàn ${walkN}`);
  // vào bệ chỉ qua 4 lối: bịt các lối đó (ô sàn xa tâm) thì từ ngoài không tới được tâm
  const shut = new Set();
  for (let j = 0; j < PLAZA.rows.length; j++) for (let i = 0; i < PLAZA.rows[j].length; i++) {
    const y = cy + PLAZA.y0 + j; const x = cx + PLAZA.x0 + i; if (cell(i, j) === '.' && (y < cy - 8 || y > cy + 12 || Math.abs(x - cx) > 15)) shut.add(x + ',' + y);
  }
  const seen = new Set([cx + ',' + cy]), q = [[cx, cy]]; let out = false;
  while (q.length && !out) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k) || shut.has(k) || solidAt(nx, ny)) continue;
      if (Math.abs(nx - cx) > 24 || Math.abs(ny - cy) > 19) { out = true; break; }
      seen.add(k); q.push([nx, ny]);
    }
  }
  assert.ok(!out, 'mép bệ có lỗ hở ngoài 4 lối');
});
