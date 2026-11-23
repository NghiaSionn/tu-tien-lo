// (24/11, quyết định 2b) Yêu Vương "Triệu Ma Ảnh": gồng có ma ấn báo trước -> ma ảnh trồi lên đúng chỗ báo,
// không sát người chơi, tự tan sau LIFE giây (không tính giết, không kinh nghiệm), có trần số quân, chủ chết thì tan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss, makeRunEnemy } from '../src/systems/director.js';
import { BOSS, TACTICS, BOSS_SKILL_LABELS } from '../src/core/config.js';
import { BOSS_SKILLS } from '../src/systems/tactics.js';

const S = BOSS.FINAL.SUMMON, DT = 1 / 30;
function arena(seed = 77) {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 });
  r.scene.map.tiles.fill(0); r.scene.monsters.length = 0;
  r.dir.mini = 'DEAD'; r.dir.final = 'ALIVE'; r.time = BOSS.FINAL.AT + 1;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 1, dead: false };
  const b = makeBoss(r, 'FINAL', p.x - 130, p.y, 1);
  b.gapT = 0; b.patIdx = BOSS.FINAL.ORDER.indexOf('summon');
  const step = (n = 1, ev = []) => { for (let i = 0; i < n; i++) { p.inv = 1; updateRun(r, p, DT, ev); r.hp = r.maxHp; r.pendingDrafts = 0; } return ev; };
  const shades = () => r.scene.monsters.filter(m => m.shade && !m.dead);
  return { r, p, b, step, shades };
}

test('Triệu Ma Ảnh: có trong chuỗi chiêu + bộ chọn chiêu, có tên/màu hiển thị', () => {
  assert.ok(BOSS.FINAL.ORDER.includes('summon') && BOSS.FINAL.REMIX.ORDER.includes('summon'));
  assert.ok(BOSS_SKILLS.FINAL.some(s => s.id === 'summon') && BOSS_SKILLS.FINAL_V2.some(s => s.id === 'summon'));
  assert.ok(BOSS_SKILL_LABELS.summon && BOSS_SKILL_LABELS.summon[0] === 'Triệu Ma Ảnh');
});

test('Triệu Ma Ảnh: gồng có ma ấn báo trước (chưa có quân), hết gồng ma ảnh trồi lên ĐÚNG chỗ báo, không sát người chơi', () => {
  const { r, p, b, step, shades } = arena();
  for (let i = 0; i < 30 && b.st !== 'windup'; i++) step();
  assert.equal(b.pat, 'summon'); assert.equal(b.st, 'windup');
  const spots = b.sumSpots.map(s => [...s]);
  assert.equal(spots.length, S.N);
  for (const [x, y] of spots) { assert.ok(r.scene.map.canStand(x, y)); assert.ok(Math.hypot(x - p.x, y - p.y) >= S.MIN_P); }
  assert.equal(shades().length, 0, 'đang gồng chưa có ma ảnh');
  for (let i = 0; i < 60 && b.st === 'windup'; i++) step();
  const sh = shades();
  assert.equal(sh.length, spots.length);
  for (const m of sh) {
    assert.ok(m.summoned && m.xp === 0 && m.life > 0);
    assert.ok(spots.some(([x, y]) => Math.hypot(x - m.x, y - m.y) < 12), 'trồi lên đúng chỗ ma ấn');
  }
});

test('Triệu Ma Ảnh: ma ảnh tự tan sau LIFE giây, không tính giết, không rơi kinh nghiệm', () => {
  const { r, b, step, shades } = arena();
  for (let i = 0; i < 120 && !shades().length; i++) step();
  assert.ok(shades().length > 0);
  b.st = 'recover'; b.stT = 999;   // giữ boss đứng nghỉ: không gọi thêm trong lúc chờ
  for (const m of shades()) { m.x += 400; m.speed = 0; }   // đưa ra xa người chơi: kiếm khí không chém trúng
  const k0 = r.kills, x0 = r.xp, o0 = r.scene.orbs.length;
  step(Math.ceil((S.LIFE + 0.5) / DT));
  assert.equal(shades().length, 0, 'hết thời gian thì tan');
  assert.equal(r.kills, k0); assert.equal(r.xp, x0); assert.equal(r.scene.orbs.length, o0);
});

test('Triệu Ma Ảnh: đủ trần quân thì không gọi thêm (đổi sang đạn tỏa); chủ chết thì ma ảnh tan', () => {
  const { r, b, p, step, shades } = arena();
  for (let i = 0; i < TACTICS.MAX_SUMMONED; i++) { const m = makeRunEnemy(r, 'chaser', p.x + 150, p.y + 40 + i * 4, 1); m.summoned = m.shade = true; m.life = 99; m.speed = 0; }
  for (let i = 0; i < 30 && b.st !== 'windup'; i++) step();
  assert.equal(b.pat, 'burst', 'đủ quân -> đạn tỏa');
  assert.equal(shades().length, TACTICS.MAX_SUMMONED);
  const k0 = r.kills;
  b.hp = 0; b.dead = true; step(2);
  assert.equal(shades().length, 0, 'chủ chết: ma ảnh tan');
  assert.equal(r.kills, k0 + 1, 'chỉ tính boss, ma ảnh tan không tính giết');
});
