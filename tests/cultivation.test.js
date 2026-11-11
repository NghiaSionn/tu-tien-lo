import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gainTuvi, usePill, buyPill, canBreak, levelUp, resolveTribulation, deathPenalty, medRate } from '../src/systems/cultivation.js';
import { need, maxHp } from '../src/progression/realm.js';

const meta = o => ({ realmLevel: 0, cultivationXp: 0, hp: 100, linhThach: 0, pills: 1, ...o });

test('tu vi không vượt ngưỡng, báo đầy đúng lúc', () => {
  const m = meta();
  assert.equal(gainTuvi(m, 59), false);
  assert.equal(gainTuvi(m, 500), true);
  assert.equal(m.cultivationXp, need(0));
  assert.equal(gainTuvi(m, 10), false);
  assert.equal(gainTuvi(m, NaN), false);
  assert.equal(gainTuvi(m, -5), false);
  assert.equal(m.cultivationXp, need(0));
});

test('mua đan không làm linh thạch âm', () => {
  const m = meta({ linhThach: 60 });
  assert.equal(buyPill(m), true); assert.equal(buyPill(m), true); assert.equal(buyPill(m), false);
  assert.equal(m.linhThach, 10); assert.equal(m.pills, 3);
});

test('dùng đan (M3-01): cho linh khí = 25% ngưỡng / hiệu suất trong trận; không dùng khi hết đan hoặc ở đỉnh', () => {
  const m = meta({ pills: 1, lingQi: 0 });
  assert.equal(usePill(m), 10); assert.equal(m.pills, 0); assert.equal(m.lingQi, 10); assert.equal(m.cultivationXp, 0);
  assert.equal(usePill(m), 0); assert.equal(m.pills, 0);
  const top = meta({ pills: 3, lingQi: 0, realmLevel: 17 });
  assert.equal(usePill(top), 0); assert.equal(top.pills, 3);
});

test('đột phá: lên bậc, reset tu vi, hồi đầy máu; đỉnh 17 không đột phá', () => {
  const m = meta({ cultivationXp: 60 });
  assert.equal(canBreak(m), true); levelUp(m);
  assert.deepEqual([m.realmLevel, m.cultivationXp, m.hp], [1, 0, maxHp(1)]);
  const top = meta({ realmLevel: 17, cultivationXp: need(17) });
  assert.equal(canBreak(top), false);
});

test('lôi kiếp kiểu cũ: thành/bại theo rng tiêm vào, thất bại không tụt cảnh giới', () => {
  const ok = meta({ realmLevel: 8, cultivationXp: need(8) });
  assert.equal(resolveTribulation(ok, () => 0.1), true); assert.equal(ok.realmLevel, 9);
  const bad = meta({ realmLevel: 8, cultivationXp: 1000, hp: 300 });
  assert.equal(resolveTribulation(bad, () => 0.9), false);
  assert.equal(bad.realmLevel, 8); assert.equal(bad.cultivationXp, 700); assert.equal(bad.hp, Math.round(maxHp(8) * 0.3));
});

test('chết: mất 10% tu vi, hồi đầy máu', () => {
  const m = meta({ cultivationXp: 50, hp: 0 });
  deathPenalty(m); assert.equal(m.cultivationXp, 45); assert.equal(m.hp, 100);
});

test('tốc độ thiền baseline', () => {
  assert.equal(medRate(0, false), 2); assert.equal(medRate(0, true), 6);
});

// ---- M3-01: linh khí -> tu vi qua tọa thiền ----
import { meditateTick, convertRate, yieldOf, trickleRate } from '../src/systems/cultivation.js';
import { MEDITATION } from '../src/core/config.js';

test('tọa thiền chuyển hóa linh khí đúng tốc độ và hiệu suất; trong trận nhanh và lời hơn', () => {
  const a = meta({ lingQi: 1000 }), b = meta({ lingQi: 1000 });
  meditateTick(a, 1, true); meditateTick(b, 1, false);
  assert.equal(a.lingQi, 1000 - convertRate(0, true));
  assert.ok(Math.abs(a.cultivationXp - convertRate(0, true) * MEDITATION.YIELD) < 1e-9);
  assert.equal(b.lingQi, 1000 - convertRate(0, false));
  assert.ok(a.cultivationXp > b.cultivationXp * 3);
  assert.ok(yieldOf(true) > yieldOf(false));
});

test('tu vi đầy thì ngừng tiêu linh khí; không vượt ngưỡng', () => {
  const m = meta({ lingQi: 1000 });
  for (let i = 0; i < 600; i++) meditateTick(m, 1 / 30, true);
  assert.equal(m.cultivationXp, need(0));
  const left = m.lingQi;
  assert.ok(Math.abs(left - (1000 - need(0) / MEDITATION.YIELD)) < 1e-6, 'chỉ tiêu đúng phần cần');
  meditateTick(m, 5, true);
  assert.equal(m.lingQi, left);
});

test('hết linh khí: ngoài trận không tăng; trong trận chỉ một dòng rất nhỏ (chống AFK vô hạn)', () => {
  const out = meta({ lingQi: 0 }); meditateTick(out, 60, false);
  assert.equal(out.cultivationXp, 0);
  const inn = meta({ lingQi: 0 }); meditateTick(inn, 10, true);
  assert.ok(Math.abs(inn.cultivationXp - trickleRate(0, true) * 10) < 1e-9);
  assert.ok(trickleRate(0, true) <= medRate(0, true) * 0.1 + 1e-9);
  const withQi = meta({ lingQi: 1000 }), dry = meta({ lingQi: 0 });
  meditateTick(withQi, 2, true); meditateTick(dry, 2, true);
  assert.ok(withQi.cultivationXp > dry.cultivationXp * 10, 'có linh khí nhanh hơn hẳn');
});

test('linh khí và tu vi đổi trong cùng một bước: tổng "giá trị" bảo toàn, dt xấu không làm gì', () => {
  const m = meta({ lingQi: 50 });
  const r = meditateTick(m, 0.5, true);
  assert.ok(Math.abs(m.cultivationXp - r.used * MEDITATION.YIELD) < 1e-9 && Math.abs(m.lingQi - (50 - r.used)) < 1e-9);
  for (const dt of [0, -1, NaN]) { const before = JSON.stringify(m); meditateTick(m, dt, true); assert.equal(JSON.stringify(m), before); }
});
