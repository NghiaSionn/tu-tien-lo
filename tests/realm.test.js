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
