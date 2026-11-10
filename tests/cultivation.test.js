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

test('dùng đan: +25% ngưỡng, không dùng khi hết đan hoặc tu vi đầy', () => {
  const m = meta({ pills: 1 });
  assert.equal(usePill(m), 15); assert.equal(m.pills, 0); assert.equal(m.cultivationXp, 15);
  assert.equal(usePill(m), 0); assert.equal(m.pills, 0);
  const f = meta({ pills: 3, cultivationXp: 60 });
  assert.equal(usePill(f), 0); assert.equal(f.pills, 3);
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
