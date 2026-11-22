// M10-05: Hỏa Hồ — Hỏa Vĩ (vệt lửa sau cú lao), chỉ khi run.skillsV2
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun, endRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { archetypeAI } from '../src/entities/archetypes.js';
import { updateFireTrails } from '../src/systems/firetrail.js';
import { FOX_TRAIL as F, PLAYER, SKILL_NAMES } from '../src/core/config.js';

const DT = 1 / 30;

function openSpot(map) {
  for (let k = 0; k < 400; k++) {
    const x = map.cx + ((k * 37) % 300) - 150, y = map.cy + ((k * 53) % 200) - 100;
    let ok = true;
    for (let a = 0; a < 16 && ok; a++) for (const r of [0, 40, 80, 130]) {
      const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
      if (!map.canStand(px, py) || map.blocksShot(px, py + 6)) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  throw new Error('không có khoảng trống');
}

// Một Hỏa Hồ lao vào người chơi đứng yên. Trả về các đốm lửa sinh ra (vị trí người chơi lúc sinh)
function foxDash(seed, skillsV2, dodge = false) {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.scene.monsters.length = 0;
  const sc = r.scene, map = sc.map, s = openSpot(map), p = { x: s.x, y: s.y, inv: 0, dead: false };
  const m = makeRunEnemy(r, 'charger', p.x + 90, p.y, 1); m.skCd = 0;
  const io = { map, shots: sc.enemyShots, hazards: sc.hazards, ev: [], rng: r.rng, scene: sc, skillsV2, onAttack: () => {} };
  const born = []; let seen = 0, dashed = false, dodgeDir = null;
  for (let i = 0; i < 30 * 4; i++) {
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    archetypeAI(m, p, dx, dy, d, DT, io);
    m.x += m.vx * DT; m.y += m.vy * DT;
    if (m.st === 'windup' && !dodgeDir) dodgeDir = { x: -m.dirY, y: m.dirX };
    if (dodge && m.st === 'windup') { p.x += dodgeDir.x * PLAYER.SPEED * DT; p.y += dodgeDir.y * PLAYER.SPEED * DT; }
    if (m.st === 'dash') dashed = true;
    for (; seen < sc.fireTrails.length; seen++) born.push({ f: sc.fireTrails[seen], px: p.x, py: p.y });
    if (dashed && m.st !== 'dash') break;
  }
  return { r, sc, p, m, born, dashed };
}

test('TẮT: Hỏa Hồ lao không để lại lửa (hành vi cũ)', () => {
  const t = foxDash(1, false);
  assert.ok(t.dashed); assert.equal(t.sc.fireTrails.length, 0);
});

test('BẬT: cú lao để lại vệt lửa dọc đường, có trần mỗi cú lao, không đốm nào sinh sát người chơi', () => {
  for (const seed of [1, 2, 3]) {
    for (const dodge of [false, true]) {
      const t = foxDash(seed, true, dodge);
      assert.ok(t.dashed);
      assert.ok(t.born.length >= 2, `seed ${seed}: chỉ ${t.born.length} đốm`);
      assert.ok(t.born.length <= F.MAX_PER_FOX);
      for (const b of t.born) assert.ok(Math.hypot(b.f.x - b.px, b.f.y - b.py) >= F.SAFE_R + F.R - 0.01, 'đốm sinh sát chân người chơi');
    }
  }
});

test('đốm lửa vô hại trong thời gian cảnh báo, chỉ cháy sau ARM; dính nhiều đốm vẫn tối đa 1 lần mỗi TICK; hết LIFE xóa sạch', () => {
  const sc = { fireTrails: [] }, p = { x: 100, y: 100, dead: false }, st = {};
  for (let k = 0; k < 4; k++) sc.fireTrails.push({ x: 100 + k * 3, y: 100, r: F.R, t: 0, life: F.LIFE, arm: F.ARM, dmg: 2 });
  const hits = []; let t = 0;
  while (sc.fireTrails.length) { t += DT; updateFireTrails(sc, p, DT, st, d => hits.push(t)); assert.ok(t < F.LIFE + 0.1, 'đốm không tự xóa'); }
  assert.ok(hits.length >= 1);
  assert.ok(hits[0] >= F.ARM - 1e-9, 'gây sát thương trước khi hết cảnh báo');
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i] - hits[i - 1] >= F.TICK - 1e-6, 'trùng sát thương ngoài nhịp TICK');
  assert.ok(hits.length <= Math.ceil((F.LIFE - F.ARM) / F.TICK) + 1);
});

test('trần toàn màn: nhiều Hỏa Hồ cùng lao không vượt FOX_TRAIL.MAX; kết thúc lượt dọn hết lửa', () => {
  const r = createRun({ seed: 9, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = true;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false };
  for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; const m = makeRunEnemy(r, 'charger', p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 90, 1); m.skCd = 0; }
  let peak = 0;
  for (let i = 0; i < 30 * 20; i++) {
    const a = i / 70; p.x = r.scene.map.cx + Math.cos(a) * 60; p.y = r.scene.map.cy + Math.sin(a) * 40; p.inv = 1;
    updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
    peak = Math.max(peak, r.scene.fireTrails.length);
    assert.ok(r.scene.fireTrails.length <= F.MAX);
  }
  assert.ok(peak >= 4, 'có lửa: ' + peak);
  endRun(r, 'LOSE');
  assert.equal(r.scene.fireTrails.length, 0);
});

test('nguồn sát thương Hỏa Vĩ có tên chiêu và tất định theo seed', () => {
  const snap = r => JSON.stringify({ f: r.scene.fireTrails.map(f => [Math.round(f.x), Math.round(f.y), f.t.toFixed(2)]), d: r.dmgBy });
  const runs = [0, 1].map(() => { const r = createRun({ seed: 41, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = true; r.tactics = true; r.time = 150; return r; });
  for (const r of runs) {
    const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 0, dead: false };
    for (let i = 0; i < 30 * 60 && r.status === 'RUNNING'; i++) { const a = i / 90; p.x = r.scene.map.cx + Math.cos(a) * 60; p.y = r.scene.map.cy + Math.sin(a) * 40; p.inv = 0; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0; }
  }
  assert.equal(snap(runs[0]), snap(runs[1]));
  for (const k of Object.keys(runs[0].dmgBy)) assert.ok(SKILL_NAMES[k], 'nguồn chưa có tên: ' + k);
  // đứng trên đốm đang cháy trong lượt thật -> sát thương ghi nguồn 'charger:trail'
  const r = createRun({ seed: 42, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = true; r.scene.monsters.length = 0;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 0, dead: false };
  r.scene.fireTrails.push({ x: p.x, y: p.y, r: F.R, t: F.ARM, life: F.LIFE, arm: F.ARM, dmg: 3 });
  updateRun(r, p, DT, []);
  assert.ok(r.dmgBy['charger:trail'] > 0, JSON.stringify(r.dmgBy));
});
