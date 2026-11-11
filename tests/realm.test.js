import { test } from 'node:test';
import assert from 'node:assert/strict';
import { need, power, maxHp, atk, levelName, isMajor, realmOf, MAX_L } from '../src/progression/realm.js';

test('công thức baseline v0.1 giữ nguyên', () => {
  assert.equal(need(0), 60);
  assert.equal(need(1), 83);
  assert.equal(maxHp(0), 100);
  assert.equal(atk(0), 12);
  assert.equal(maxHp(1), 125);
  assert.equal(maxHp(9), Math.round(100 * (1 + 0.25 * 9) * 1.6));
});

test('tên 18 bậc và biên đại cảnh giới', () => {
  assert.equal(levelName(0), 'Luyện Khí · Tầng 1');
  assert.equal(levelName(8), 'Luyện Khí · Tầng 9');
  assert.equal(levelName(9), 'Trúc Cơ · Sơ kỳ');
  assert.equal(levelName(12), 'Kim Đan · Sơ kỳ');
  assert.equal(levelName(15), 'Nguyên Anh · Sơ kỳ');
  assert.equal(levelName(17), 'Nguyên Anh · Hậu kỳ');
  for (const L of [8, 11, 14]) assert.equal(isMajor(L), true, `L=${L} -> ${L + 1} là đại cảnh giới`);
  for (const L of [0, 7, 9, 10, 12, 13, 15, 16]) assert.equal(isMajor(L), false, `L=${L}`);
  assert.equal(isMajor(MAX_L), false, 'đỉnh không đột phá tiếp');
  assert.deepEqual([8, 9, 11, 12, 14, 15].map(realmOf), [0, 1, 1, 2, 2, 3]);
});

test('không có NaN/Infinity, tăng đơn điệu trên 18 bậc', () => {
  for (let L = 0; L <= MAX_L; L++) {
    for (const f of [need, power, maxHp, atk]) assert.ok(Number.isFinite(f(L)) && f(L) > 0, `${f.name}(${L})`);
    if (L > 0) { assert.ok(need(L) > need(L - 1)); assert.ok(maxHp(L) > maxHp(L - 1)); }
  }
});

// ---- M3-02: biên đại cảnh giới, mở khóa, cảnh giới không lẫn với cấp chiến đấu ----
import { grantUnlocks } from '../src/progression/realm.js';
import { levelUp, failTribulation } from '../src/systems/cultivation.js';
import { createRun } from '../src/systems/run.js';
import { computeRunReward } from '../src/progression/rewards.js';
import { sanitizeMeta, defaultMeta } from '../src/persistence/save.js';
import { REALM_UNLOCKS, DIFFICULTY } from '../src/core/config.js';

const ctx = { canStand: () => true, hubSpawn: { x: 1, y: 1 } };

test('biên đại cảnh giới: 8→9, 11→12, 14→15 là thiên kiếp; max L=17', () => {
  for (let L = 0; L <= MAX_L; L++) assert.equal(isMajor(L), [8, 11, 14].includes(L), 'L=' + L);
  assert.equal(levelName(8), 'Luyện Khí · Tầng 9'); assert.equal(levelName(9), 'Trúc Cơ · Sơ kỳ');
  assert.equal(levelName(11), 'Trúc Cơ · Hậu kỳ'); assert.equal(levelName(12), 'Kim Đan · Sơ kỳ');
  assert.equal(levelName(14), 'Kim Đan · Hậu kỳ'); assert.equal(levelName(15), 'Nguyên Anh · Sơ kỳ');
  assert.equal(levelName(17), 'Nguyên Anh · Hậu kỳ'); assert.equal(MAX_L, 17);
  const m = defaultMeta(ctx.hubSpawn); m.realmLevel = 17;
  const r = levelUp(m); assert.equal(m.realmLevel, 17); assert.equal(r.to, 17);
});

test('đột phá lên đại cảnh giới cấp mở khóa đúng một lần; tầng nhỏ không cấp gì', () => {
  const m = defaultMeta(ctx.hubSpawn);
  for (let L = 0; L < MAX_L; L++) {
    const r = levelUp(m);
    const u = REALM_UNLOCKS[r.to];
    assert.equal(r.granted.length, u ? 1 : 0, 'lên ' + r.to);
  }
  assert.deepEqual(m.unlocks.skills, ['sword_array', 'body_aura', 'fire_ring']);
  assert.equal(m.unlocks.tier, 3);
  assert.deepEqual(grantUnlocks(m), [], 'gọi lại không nhân đôi');
  assert.equal(m.unlocks.skills.length, 3);
});

test('save cũ đang ở Kim Đan nhận đủ mở khóa khi nạp (grantUnlocks idempotent)', () => {
  const m = sanitizeMeta({ realmLevel: 13 }, ctx);
  assert.deepEqual(m.unlocks.skills, []);
  grantUnlocks(m);
  assert.deepEqual(m.unlocks.skills, ['sword_array', 'body_aura']); assert.equal(m.unlocks.tier, 2);
});

test('thua thiên kiếp: giữ cảnh giới, mất 30% tu vi, xóa cờ đang độ kiếp', () => {
  const m = defaultMeta(ctx.hubSpawn); m.realmLevel = 8; m.cultivationXp = 1000; m.tribPending = true;
  failTribulation(m);
  assert.equal(m.realmLevel, 8); assert.equal(m.cultivationXp, 700); assert.equal(m.tribPending, false); assert.ok(m.hp >= 1);
});

test('cảnh giới không lẫn với cấp chiến đấu: run lên cấp không đổi meta; meta lưu/nạp giữ nguyên cảnh giới', () => {
  const m = defaultMeta(ctx.hubSpawn); m.realmLevel = 9; grantUnlocks(m);
  const r = createRun({ seed: 3, startSkill: 'sword_array', realmLevel: m.realmLevel, difficulty: 1 });
  r.level = 30;
  assert.equal(m.realmLevel, 9);
  const back = sanitizeMeta(JSON.parse(JSON.stringify(m)), ctx);
  assert.equal(back.realmLevel, 9); assert.deepEqual(back.unlocks, m.unlocks);
});

test('độ khó: kẹp trong khoảng; thưởng nhân theo độ khó', () => {
  assert.equal(createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: 0, difficulty: 99 }).diff, DIFFICULTY.length - 1);
  assert.equal(createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: 0, difficulty: -3 }).diff, 0);
  const mk = d => { const r = createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: 0, difficulty: d }); Object.assign(r, { time: 300, kills: 300, level: 20, outcome: 'LOSE' }); return computeRunReward(r, { realmLevel: 0, firstClear: true }); };
  assert.ok(mk(2).linhThach >= Math.floor(mk(0).linhThach * DIFFICULTY[2].reward) - 1 && mk(2).linhThach > mk(0).linhThach);
});
