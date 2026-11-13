// M8-02: bản đồ tông môn — đi tới được mọi khu, không ô kẹt, quảng trường đủ cho thiên kiếp, map cũ không đổi
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHubMap, makeSectMap, BUILDING, FENCE, TREE, WATER, ROCK } from '../src/world/map.js';
import { HUB, TRIBULATION, TILE as T } from '../src/core/config.js';
import { SECT } from '../src/data/sect_layout.js';

const solid = t => t === WATER || t === TREE || t === ROCK || t === BUILDING || t === FENCE;

test('tắt cờ: động phủ cũ y hệt trước M8 (dấu vân tay ô)', () => {
  const m = makeHubMap();
  let h = 2166136261; for (const t of m.tiles) { h ^= t; h = Math.imul(h, 16777619) >>> 0; }
  assert.equal(h, 1741762572);
  assert.equal(m.sect, undefined);
});

const m = makeSectMap(), S = m.sect;
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
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || reach[ny * m.w + nx] || solid(m.tileAt(nx, ny))) continue;
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
    if (!solid(t)) assert.ok(reach[y * m.w + x], `ô (${lx},${ly}) đi được nhưng không tới được`);
    if (lx === 0 || ly === 0 || lx === SECT.W - 1 || ly === SECT.H - 1) assert.equal(t, TREE, `viền (${lx},${ly})`);
  }
});

test('quảng trường trống cho thiên kiếp (mọi điểm trong ARENA_R + lề đều đứng được) và công trình là ô đặc', () => {
  for (let a = 0; a < 64; a++) for (const r of [0, 30, 60, TRIBULATION.ARENA_R, TRIBULATION.ARENA_R + 8]) {
    const x = m.cx + Math.cos(a / 64 * 6.283) * r, y = m.cy + Math.sin(a / 64 * 6.283) * r;
    assert.ok(m.canStand(x, y), `thiên kiếp bị chặn tại (${Math.round(x - m.cx)},${Math.round(y - m.cy)})`);
  }
  for (const b of S.buildings) assert.ok(!m.canStand(b.px + b.pw / 2, b.py + b.ph / 2), b.id + ' không đi xuyên');
});
