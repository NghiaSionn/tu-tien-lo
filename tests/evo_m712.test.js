// M7-12: Cực Hàn Băng Trận (đóng băng + nổ lan có trần) và Linh Châu Phong Ấn (phong ấn rải theo đường chạy)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, makeCtx } from '../src/systems/run.js';
import { frostHit, updateSkills } from '../src/systems/combat.js';
import { evolutionReady, candidates, applyCard } from '../src/progression/draft.js';
import { makeMonster } from '../src/entities/monsters.js';
import { EVOLUTIONS, SKILLS } from '../src/data/skills.js';

const P = EVOLUTIONS.cuc_han_bang_tran.params;
const mkRun = (start, unlocked) => createRun({ seed: 5, startSkill: start, realmLevel: 0, unlocked });
const mob = (run, x, y, boss = false) => { const m = makeMonster(x, y, 1, { hp: 1e6 }); m.tags = m.tags || {}; if (boss) m.boss = true; run.scene.monsters.push(m); return m; };

test('2 tiến hóa mới xuất hiện qua thẻ bình thường khi đủ công thức', () => {
  for (const [evo, base, part, unlocked] of [['cuc_han_bang_tran', 'ice_needle', 'ice_nova', ['ice_needle', 'ice_nova']], ['linh_chau_phong_an', 'spirit_orb', 'wind_step', ['spirit_orb', 'wind_step']]]) {
    const run = mkRun(base, unlocked);
    run.skills[0].level = SKILLS[base].maxLevel; run.time = 100;
    assert.ok(!evolutionReady(run, evo));
    run.skills.push({ id: part, level: 1, evolved: null, st: {} });
    assert.ok(evolutionReady(run, evo));
    const card = candidates(run).find(c => c.key === 'evo:' + evo);
    assert.ok(card, evo);
    assert.ok(applyCard(run, card, {}));
    assert.equal(run.skills[0].evolved, evo);
  }
});

test('Cực Hàn: 3 ấn thì đóng băng, nổ lan cộng ấn sang con bên cạnh; miễn đóng băng ngay sau đó', () => {
  const run = mkRun('ice_needle', ['ice_needle']), ctx = makeCtx(run, { x: 0, y: 0 }, []);
  const a = mob(run, 100, 100), b = mob(run, 110, 100), far = mob(run, 300, 100);
  frostHit(ctx, a, P); frostHit(ctx, a, P);
  assert.ok(!a.slow?.frozen);
  frostHit(ctx, a, P);
  assert.ok(a.slow.frozen && a.slow.f >= P.freezeSlow && a.slow.t === P.freezeTime);
  assert.equal(b.frost, 1, 'nổ lan cộng 1 ấn cho con gần');
  assert.ok(!far.frost, 'con xa không bị');
  assert.ok(b.hp < b.max, 'nổ lan có sát thương');
  for (let i = 0; i < 5; i++) frostHit(ctx, a, P);
  assert.equal(a.frost, 0, 'đang miễn: không tích ấn');
});

test('Cực Hàn: boss không bị đóng băng; nổ lan có trần mỗi khung (không chuỗi vô hạn)', () => {
  const run = mkRun('ice_needle', ['ice_needle']), ctx = makeCtx(run, { x: 0, y: 0 }, []);
  const boss = mob(run, 50, 50, true);
  for (let i = 0; i < P.stacks; i++) frostHit(ctx, boss, P);
  assert.ok(!boss.slow.frozen && boss.slow.f < P.freezeSlow);
  // cụm 30 con sát nhau, mỗi con sẵn 2 ấn: một cú kích nổ chỉ lan tối đa burstBudget lần
  const ctx2 = makeCtx(run, { x: 0, y: 0 }, []);
  const pack = Array.from({ length: 30 }, (_, i) => { const m = mob(run, 400 + (i % 6) * 6, 400 + Math.floor(i / 6) * 6); m.frost = 2; m.frostAt = 0; return m; });
  ctx2.time = 1;
  frostHit(ctx2, pack[0], P);
  assert.equal(ctx2.ev.filter(e => e.type === 'pulse').length, P.burstBudget);
  assert.equal(ctx2.frostBudget, 0);
});

test('Linh Châu Phong Ấn: chạy thì rải phong ấn (tối đa maxAnchors), đứng yên thì không, hết hạn thì tan; châu phong ấn đánh quái', () => {
  const run = mkRun('spirit_orb', ['spirit_orb', 'wind_step']);
  run.skills[0].evolved = 'linh_chau_phong_an';
  const pl = { x: 200, y: 200, fx: 1, fy: 0 }, dt = 1 / 30;
  const st = () => run.skills[0].st;
  for (let i = 0; i < 30; i++) updateSkills(makeCtx(run, pl, []), dt);       // đứng yên 1 s
  assert.equal(st().anchors.length, 0);
  for (let i = 0; i < 90; i++) { pl.x += 4; updateSkills(makeCtx(run, pl, []), dt); }   // chạy 360 px trong 3 s
  assert.equal(st().anchors.length, EVOLUTIONS.linh_chau_phong_an.params.maxAnchors);
  const an = st().anchors[0];
  const m = mob(run, an.x, an.y);
  for (let i = 0; i < 30; i++) updateSkills(makeCtx(run, pl, []), dt);
  assert.ok(m.hp < m.max, 'quái đứng trong phong ấn bị đánh');
  for (let i = 0; i < 150; i++) updateSkills(makeCtx(run, pl, []), dt);    // đứng yên 5 s > life
  assert.equal(st().anchors.length, 0);
});
