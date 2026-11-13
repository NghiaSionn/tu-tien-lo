// M7-07: mục tiêu sau lượt — 3 trạng thái tu vi, thành tựu gần nhất, xem trước không đụng meta thật
import test from 'node:test';
import assert from 'node:assert/strict';
import { metaGoals, previewAfterClaim } from '../src/progression/goals.js';
import { defaultMeta } from '../src/persistence/save.js';
import { need } from '../src/progression/realm.js';
import { MEDITATION } from '../src/core/config.js';

const fresh = () => { const m = defaultMeta({ x: 0, y: 0 }); m.lingQi = 0; m.cultivationXp = 0; return m; };

test('chưa đủ linh khí: nêu số linh khí còn thiếu, hướng vào bí cảnh', () => {
  const m = fresh();
  const g = metaGoals(m);
  assert.equal(g[0].kind, 'realm'); assert.equal(g[0].state, 'short'); assert.equal(g[0].action, 'run');
  assert.match(g[0].text, /thiếu khoảng \d+ linh khí/);
});

test('đủ linh khí: hướng tọa thiền', () => {
  const m = fresh(); m.lingQi = Math.ceil(need(m.realmLevel) / MEDITATION.YIELD) + 1;
  const g = metaGoals(m);
  assert.equal(g[0].state, 'enough_qi'); assert.equal(g[0].action, 'meditate');
});

test('tu vi đầy: hướng đột phá; ở bậc lớn gọi là độ thiên kiếp', () => {
  const m = fresh(); m.cultivationXp = need(m.realmLevel);
  assert.equal(metaGoals(m)[0].action, 'break');
  m.realmLevel = 8; m.cultivationXp = need(8);
  assert.match(metaGoals(m)[0].text, /thiên kiếp/);
});

test('tối đa 2 mục tiêu; không gợi ý thành tựu đã đạt; ưu tiên thành tựu mở công pháp', () => {
  const m = fresh(); m.stats.runs = 4;
  const g = metaGoals(m);
  assert.ok(g.length <= 2);
  const a = g.find(x => x.kind === 'achievement');
  assert.equal(a.id, 'runs_5'); assert.equal(a.cur, 4); assert.equal(a.max, 5);
  m.achievements.push('runs_5');
  assert.notEqual(metaGoals(m).find(x => x.kind === 'achievement')?.id, 'runs_5');
});

test('xem trước sau khi nhận thưởng: dùng phần thưởng đang chờ, không đổi meta thật', () => {
  const m = fresh(); m.stats.runs = 5;
  m.pendingReward = { id: 'r1', linhThach: 10, lingQi: 999, craftMats: 0, tickets: 0, bosses: [], summary: null };
  const snap = JSON.stringify(m);
  const pv = previewAfterClaim(m);
  assert.equal(JSON.stringify(m), snap);
  assert.equal(pv.lingQi, 999);
  assert.ok(pv.achievements.includes('runs_5'));
  assert.equal(metaGoals(pv)[0].state === 'short' ? 'short' : 'ok', 'ok');
});
