// M7-10: biến thể bí cảnh bốc theo seed, áp luật bằng hệ số cố định
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickVariant, variantOf, vmod } from '../src/systems/variants.js';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { computeRunReward } from '../src/progression/rewards.js';
import { RUN_VARIANTS, DIRECTOR, RUN } from '../src/core/config.js';
import { defaultMeta } from '../src/persistence/save.js';

const mk = (variant, seed = 42) => createRun({ seed, startSkill: 'sword_qi', realmLevel: 0, variant });

test('bốc theo seed: tái lập, đủ mọi biến thể, gần đúng tỉ lệ; cờ tắt -> Bình thường', () => {
  assert.equal(pickVariant(123), pickVariant(123));
  const cnt = {};
  for (let s = 1; s <= 5000; s++) { const v = pickVariant(s); cnt[v] = (cnt[v] || 0) + 1; }
  const total = Object.values(RUN_VARIANTS).reduce((a, v) => a + v.weight, 0);
  for (const [id, v] of Object.entries(RUN_VARIANTS)) {
    const want = 5000 * v.weight / total;
    assert.ok(Math.abs(cnt[id] - want) < want * 0.15, `${id}: ${cnt[id]} ~ ${want}`);
  }
  assert.equal(pickVariant(123, false), 'thuong');
});

test('bốc biến thể không làm lệch run.rng (seed cũ vẫn cho cùng run)', () => {
  const a = mk('thuong', 9), b = mk('linh_trieu', 9);
  assert.equal(a.rng(), b.rng());
});

test('id lạ -> Bình thường; Bình thường không có hệ số nào', () => {
  assert.equal(mk('khong_co').variant, 'thuong');
  const r = mk('thuong');
  for (const k of ['xp', 'enemySpeed', 'spawnEvery', 'eliteEvery', 'reward']) assert.equal(vmod(r, k), 1);
});

test('Linh Triều: quái thường nhanh hơn đúng hệ số; Ma Ảnh: tinh anh tới sớm', () => {
  const a = mk('thuong'), b = mk('linh_trieu');
  const ma = makeRunEnemy(a, 'chaser', 0, 0, 1), mb = makeRunEnemy(b, 'chaser', 0, 0, 1);
  // cùng seed nhưng grade dùng rng: so tỉ lệ khi grade giống nhau
  if (ma.lvl === mb.lvl) assert.ok(Math.abs(mb.speed / ma.speed - RUN_VARIANTS.linh_trieu.mods.enemySpeed) < 1e-9);
  assert.equal(mk('ma_anh').dir.eliteT, RUN_VARIANTS.ma_anh.mods.eliteFirst);
  assert.equal(mk('thuong').dir.eliteT, DIRECTOR.ELITE.FIRST);
});

test('phần thưởng: Ma Ảnh chỉ nhân khi thắng, Phong Linh luôn nhân; không đổi vé', () => {
  const meta = defaultMeta({ x: 0, y: 0 });
  const fake = (variant, outcome) => Object.assign(mk(variant), { outcome, time: 300, kills: 200, level: 20, eliteKills: 3, rewards: [] });
  const base = computeRunReward(fake('thuong', 'WIN'), meta);
  const ma = computeRunReward(fake('ma_anh', 'WIN'), meta);
  const maLose = computeRunReward(fake('ma_anh', 'LOSE'), meta), baseLose = computeRunReward(fake('thuong', 'LOSE'), meta);
  const pl = computeRunReward(fake('phong_linh', 'LOSE'), meta);
  assert.ok(Math.abs(ma.linhThach - base.linhThach * 1.3) <= 1);
  assert.equal(maLose.linhThach, baseLose.linhThach);
  assert.ok(Math.abs(pl.linhThach - baseLose.linhThach * 1.15) <= 1);
  assert.equal(ma.tickets, base.tickets);
});

test('mỗi biến thể chạy 7 phút không lỗi, không quá trần quái, không sinh quái sát người', () => {
  for (const id of Object.keys(RUN_VARIANTS)) {
    const run = mk(id, 77), p = { x: run.scene.map.cx, y: run.scene.map.cy, fx: 1, fy: 0, inv: 0 };
    const ev = [];
    let maxAlive = 0;
    for (let i = 0; i < 7 * 60 * 20 && run.status === 'RUNNING'; i++) {
      const before = new Set(run.scene.monsters);
      p.inv = 99;                                   // bất tử để chạy hết thời gian
      updateRun(run, p, 0.05, ev); ev.length = 0; run.pendingDrafts = 0;
      for (const m of run.scene.monsters) if (!before.has(m) && !m.boss && !m.summoned) assert.ok(Math.hypot(m.x - p.x, m.y - p.y) >= DIRECTOR.SAFE_R - 1, `${id}: quái sinh sát người`);
      maxAlive = Math.max(maxAlive, run.scene.monsters.filter(m => !m.boss).length);
    }
    assert.ok(maxAlive <= RUN.SPAWN.MAX_ALIVE, `${id}: ${maxAlive} quái thường`);   // boss sinh ngoài trần (có sẵn)
  }
});
