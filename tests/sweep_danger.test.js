// H-1a (24/11): tia Ma Quang Hoành Tảo nằm trong "hình nguy hiểm" chống chồng đòn (M10-08).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dangerShapes, safeWith, sweepSegs } from '../src/systems/tactics.js';
import { BOSS_V2, PLAYER } from '../src/core/config.js';

const S = BOSS_V2.FINAL.SWEEP;
const boss = (st, swK = 0) => ({ boss: true, bossKind: 'FINAL', x: 0, y: 0, pat: 'sweep', st, swA0: 0, swDir: 1, swK, dead: false });
const segHit = (s, x, y) => { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, l2 = vx * vx + vy * vy, k = Math.max(0, Math.min(1, ((x - s.x0) * vx + (y - s.y0) * vy) / l2)); return Math.hypot(x - s.x0 - vx * k, y - s.y0 - vy * k) < s.w; };
const inAny = (ss, x, y) => ss.some(s => segHit(s, x, y));

test('đang gồng: cả nửa vòng quét là vùng nguy hiểm, nửa kia an toàn', () => {
  const ss = dangerShapes({ hazards: [], monsters: [boss('windup')] }, { x: 0, y: 0 });
  assert.ok(ss.length >= 10);
  for (const a of [0.1, 0.8, 1.6, 2.4, 3.0]) assert.ok(inAny(ss, Math.cos(a) * 120, Math.sin(a) * 120), 'góc ' + a + ' trong vùng quét');
  for (const a of [-0.6, -1.6, -2.4]) assert.ok(!inAny(ss, Math.cos(a) * 120, Math.sin(a) * 120), 'góc ' + a + ' ngoài vùng quét');
  assert.ok(!inAny(ss, S.L + PLAYER.HITBOX + S.W + 5, 0), 'ngoài tầm L an toàn');
});

test('đang quét: phần đã quét qua không còn tính nguy hiểm', () => {
  const ss = dangerShapes({ hazards: [], monsters: [boss('sweep', 0.6)] }, { x: 0, y: 0 });   // qua dangerShapes: trạng thái 'sweep' phải được xét
  assert.ok(ss.length > 0 && sweepSegs(boss('sweep', 0.6)).length === ss.length);
  assert.ok(!inAny(ss, Math.cos(0.5) * 120, Math.sin(0.5) * 120), 'góc đã quét');
  assert.ok(inAny(ss, Math.cos(2.8) * 120, Math.sin(2.8) * 120), 'góc sắp quét');
});

test('quái thường không được thêm đòn bịt lối thoát khỏi tia quét', () => {
  const map = { canStand: () => true };
  const player = { x: 60, y: 4 };   // trong vùng sắp quét, sát mép: lối thoát là bước lên nửa vòng không bị quét (tầm 41 px)
  const dangers = dangerShapes({ hazards: [], monsters: [boss('windup')] }, player);
  assert.ok(safeWith(map, player, dangers, []), 'vẫn còn lối thoát khi chỉ có tia quét');
  const wall = [{ x: 60, y: -30, r: 55 }];   // đòn mới phủ đúng nửa an toàn phía trên
  assert.ok(safeWith(map, player, [], wall), 'riêng đòn mới thì vẫn còn chỗ (nên bị chặn là do chồng lên tia quét)');
  assert.equal(safeWith(map, player, dangers, wall), false, 'đòn mới bịt nốt nửa an toàn -> bị chặn');
});
