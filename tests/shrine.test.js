// M3-04: Linh Mạch — một lần, không dùng khi boss sống, không phá trạng thái wave/boss
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { placeShrine, useShrine, shrineReady, shrineSealed } from '../src/systems/shrine.js';
import { makeBoss } from '../src/systems/director.js';
import { computeRunReward } from '../src/progression/rewards.js';
import { runStats } from '../src/systems/combat.js';
import { SHRINE, BOSS } from '../src/core/config.js';

const setup = () => { const r = createRun({ seed: 11, startSkill: 'sword_qi', realmLevel: 0 }); const p = { x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0 }; return { r, p }; };

test('hạ Lang Vương thì Linh Mạch hiện ra, đứng được, chỉ một cái', () => {
  const { r, p } = setup();
  r.time = BOSS.MINI.AT; r.dir.mini = 'PENDING';
  for (let i = 0; i < 3; i++) { p.inv = 9; updateRun(r, p, 1 / 30, []); }
  const b = r.scene.monsters.find(m => m.bossKind === 'MINI'); assert.ok(b);
  assert.equal(r.shrine, undefined);
  b.hp = 0; b.dead = true; p.inv = 9; updateRun(r, p, 1 / 30, []);
  assert.ok(r.shrine && r.scene.map.canStand(r.shrine.x, r.shrine.y));
  const first = r.shrine; placeShrine(r, 0, 0); assert.equal(r.shrine, first);
});

test('ba lựa chọn đúng tác dụng, mỗi run một lần', () => {
  for (const id of ['heal', 'power', 'qi']) {
    const { r, p } = setup(); placeShrine(r, p.x, p.y);
    r.hp = 10;
    const before = computeRunReward({ ...r, outcome: 'LOSE', rewards: [] }, { realmLevel: 0 }).lingQi;
    assert.equal(shrineReady(r, p), true);
    assert.equal(useShrine(r, id), true);
    if (id === 'heal') assert.equal(r.hp, 10 + r.maxHp * SHRINE.HEAL);
    if (id === 'power') assert.ok(Math.abs(runStats(r).damage - (1 + SHRINE.DMG_BUFF)) < 1e-9);
    if (id === 'qi') assert.equal(computeRunReward({ ...r, outcome: 'LOSE', rewards: [] }, { realmLevel: 0 }).lingQi, before + SHRINE.QI);
    assert.equal(useShrine(r, 'heal'), false, 'không dùng lần hai');
    assert.equal(shrineReady(r, p), false);
  }
});

test('boss đang sống: Linh Mạch bị phong ấn, không hồi máu giữa trận boss', () => {
  const { r, p } = setup(); placeShrine(r, p.x, p.y);
  r.time = 300; const b = makeBoss(r, 'FINAL', p.x + 100, p.y, 1);
  r.hp = 10;
  assert.equal(shrineSealed(r), true); assert.equal(shrineReady(r, p), false);
  assert.equal(useShrine(r, 'heal'), false); assert.equal(r.hp, 10);
  b.dead = true;
  assert.equal(shrineReady(r, p), true);
});

test('đứng xa không dùng được; lựa chọn lạ không đổi gì; run đã kết thúc không dùng được', () => {
  const { r, p } = setup(); placeShrine(r, p.x + 200, p.y);
  assert.equal(shrineReady(r, p), false);
  assert.equal(useShrine(r, 'hack'), false); assert.equal(r.shrine.used, false);
  r.status = 'ENDED';
  assert.equal(useShrine(r, 'heal'), false);
});
