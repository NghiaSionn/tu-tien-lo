// M10-04: Dã Lang săn theo đàn (FEATURES.enemySkillsV2 / run.skillsV2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { archetypeAI } from '../src/entities/archetypes.js';
import { updateMonsters } from '../src/entities/monsters.js';
import { updatePacks } from '../src/systems/packs.js';
import { FEATURES, WOLF_PACK as WP, PLAYER, TILE as T } from '../src/core/config.js';
import { WATER } from '../src/world/map.js';

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

// Sân thử: chỉ có các con sói đặt sẵn, không director. step(onTick) chạy 1 tick.
function arena(seed, wolves, opts = {}) {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.scene.monsters.length = 0;
  const sc = r.scene, map = sc.map, s = opts.at || openSpot(map), p = { x: s.x, y: s.y, inv: 0, dead: false };
  const ws = wolves.map(([dx, dy]) => { const m = makeRunEnemy(r, 'chaser', p.x + dx, p.y + dy, 1); m.skCd = 0; return m; });
  const hits = [], st = {};
  let t = 0;
  const onAttack = (m, dmg, src) => hits.push({ t, src: src || 'chaser', m });
  const io = { map, shots: sc.enemyShots, hazards: sc.hazards, ev: [], rng: r.rng, scene: sc, skillsV2: true, onAttack };
  const step = () => {
    t += DT;
    updatePacks(sc, p, st, DT);
    updateMonsters(sc, p, DT, [], { safe: null, onAttack, ai: (m, pl, dx, dy, d, dt) => archetypeAI(m, pl, dx, dy, d, dt, io) });
  };
  return { r, sc, map, p, ws, hits, step, get t() { return t; } };
}

test('cờ mặc định TẮT; TẮT tường minh giống hệt mặc định', () => {
  assert.equal(FEATURES.enemySkillsV2, false);
  const snap = r => JSON.stringify(r.scene.monsters.map(m => [Math.round(m.x), Math.round(m.y), m.st, m.role || '']));
  const a = createRun({ seed: 31, startSkill: 'sword_qi', realmLevel: 0 }), b = createRun({ seed: 31, startSkill: 'sword_qi', realmLevel: 0 });
  b.skillsV2 = false;
  for (const r of [a, b]) { const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false }; r.time = 100; for (let i = 0; i < 30 * 40; i++) { p.inv = 1; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0; } }
  assert.equal(snap(a), snap(b));
  assert.ok(!a.scene.monsters.some(m => m.role), 'tắt cờ thì không có vai trò đàn');
});

test('BẬT: tất định (cùng seed -> cùng trạng thái đàn)', () => {
  const snap = r => JSON.stringify(r.scene.monsters.map(m => [Math.round(m.x), Math.round(m.y), m.st, m.role || '', m.packId || 0]));
  const runs = [0, 1].map(() => { const r = createRun({ seed: 32, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = true; r.tactics = true; return r; });
  for (const r of runs) { const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false }; r.time = 100; for (let i = 0; i < 30 * 40; i++) { const a = i / 80; p.x = r.scene.map.cx + Math.cos(a) * 50; p.y = r.scene.map.cy + Math.sin(a) * 30; p.inv = 1; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0; } }
  assert.equal(snap(runs[0]), snap(runs[1]));
});

test('đàn 3 con từ một phía -> tiếp cận từ 2 hướng (con sườn lệch ≥ 50° so với con áp sát)', () => {
  let ok = 0;
  for (const seed of [1, 2, 3, 4]) {
    const A = arena(seed, [[110, 0], [125, 12], [125, -12]]);
    const first = new Map();
    for (let i = 0; i < 30 * 6; i++) {
      A.p.inv = 1; A.step();
      for (const m of A.ws) if (!first.has(m) && Math.hypot(m.x - A.p.x, m.y - A.p.y) < 62) first.set(m, Math.atan2(m.y - A.p.y, m.x - A.p.x));
    }
    const flank = A.ws.find(m => m.flankA !== undefined);
    assert.ok(flank, `seed ${seed}: có con được giao vòng sườn`);
    const angs = [...first.values()];
    let maxDiff = 0;
    for (const a of angs) for (const b of angs) maxDiff = Math.max(maxDiff, Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))));
    if (maxDiff >= 50 * Math.PI / 180) ok++;
  }
  assert.ok(ok >= 3, `chỉ ${ok}/4 seed có 2 hướng tiếp cận`);
});

function pounceDuel(seed, dodge) {
  // con áp sát đứng yên sát người chơi (chỉ để thành đàn); con thứ hai vòng sườn rồi chồm. Chỉ đếm đòn chồm.
  const A = arena(seed, [[34, 0], [100, 20]]);
  A.ws[0].speed = 0;
  let windAt = -1, windEnd = -1, dodgeDir = null, lock = null;
  for (let i = 0; i < 30 * 8 && !(windEnd > 0 && A.t > windEnd + 0.6); i++) {
    const before = A.ws.map(m => m.st);
    A.step();
    A.ws.forEach((m, k) => {
      if (before[k] !== 'windup' && m.st === 'windup' && windAt < 0) { windAt = A.t; lock = [m.dirX, m.dirY]; dodgeDir = { x: -m.dirY, y: m.dirX }; }
      if (m.st === 'windup' && lock && windEnd < 0) assert.deepEqual([m.dirX, m.dirY], lock, 'hướng chồm đã khóa');
      if (before[k] === 'windup' && m.st === 'dash' && windEnd < 0) windEnd = A.t;
    });
    if (dodge && windAt > 0 && windEnd < 0) { A.p.x += dodgeDir.x * PLAYER.SPEED * DT; A.p.y += dodgeDir.y * PLAYER.SPEED * DT; }
  }
  return { windAt, windEnd, hits: A.hits.filter(h => h.src === 'chaser:pounce') };
}

test('chồm: có gồng khóa hướng; không sát thương trước khi hết gồng; đứng yên thì trúng', () => {
  let tested = 0;
  for (const seed of [1, 2, 3]) {
    const r = pounceDuel(seed, false);
    if (r.windAt < 0) continue;
    tested++;
    const pounces = r.hits.filter(h => h.src === 'chaser:pounce');
    assert.ok(pounces.length >= 1, `seed ${seed}: đứng yên phải trúng chồm`);
    for (const h of pounces) assert.ok(h.t >= r.windAt + WP.POUNCE.WINDUP - DT * 1.5, 'trúng trước khi hết gồng');
  }
  assert.ok(tested >= 2, 'sói đã chồm ở ' + tested + ' seed');
});

test('chồm: né được bằng đi bộ ngang trong lúc gồng', () => {
  let tested = 0;
  for (const seed of [1, 2, 3]) {
    const r = pounceDuel(seed, true);
    if (r.windAt < 0) continue;
    tested++;
    assert.equal(r.hits.filter(h => h.src === 'chaser:pounce').length, 0, `seed ${seed}: né rồi vẫn trúng chồm`);
  }
  assert.ok(tested >= 2);
});

test('mỗi đàn tối đa 1 con đang gồng/chồm; chỉ con vòng sườn được chồm', () => {
  for (const seed of [5, 6, 7]) {
    const A = arena(seed, [[90, 0], [100, 15], [100, -15], [110, 0], [-90, 0], [-100, 15], [-100, -15]]);
    let pounces = 0;
    for (let i = 0; i < 30 * 20; i++) {
      const a = i / 60; A.p.x += Math.cos(a) * 30 * DT; A.p.y += Math.sin(a) * 20 * DT; A.p.inv = 1;
      const before = new Map(A.ws.map(m => [m, m.st]));
      A.step();
      const per = {};
      for (const m of A.ws) {
        if (m.st === 'windup' || m.st === 'dash') per[m.packId] = (per[m.packId] || 0) + 1;
        if (before.get(m) !== 'windup' && m.st === 'windup') { pounces++; assert.equal(m.role, 'flank', 'chỉ con vòng sườn chồm'); }
      }
      for (const [id, n] of Object.entries(per)) assert.ok(n <= 1, `seed ${seed} đàn ${id}: ${n} con cùng chồm`);
    }
    assert.ok(pounces >= 2, `seed ${seed}: chồm ${pounces} lần`);
  }
});

test('đàn không kẹt hồ: sói bên kia hồ vẫn tới được người chơi khi bật kỹ năng đàn', () => {
  let tested = 0;
  for (const seed of [3, 7, 11, 19]) {
    const probe = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }), map = probe.scene.map;
    let spot = null;
    for (let y = 4; y < 52 && !spot; y++) for (let x = 4; x < 46; x++) {
      if (map.tileAt(x, y) === WATER || map.tileAt(x + 1, y) !== WATER) continue;
      let k = 1; while (map.tileAt(x + k, y) === WATER) k++;
      if (k >= 6 && !map.monSolid(x, y) && !map.monSolid(x + k, y) && !map.monSolid(x + k, y + 1)) { spot = [x, y, k]; break; }
    }
    if (!spot) continue;
    const [x, y, k] = spot, at = { x: (x + 0.5) * T, y: (y + 0.7) * T };
    const A = arena(seed, [], { at });
    A.r.scene.map = A.map;
    const ws = [[0, 0], [0, 10], [10, 5]].map(([ox, oy]) => { const m = makeRunEnemy(A.r, 'chaser', (x + k + 0.5) * T + ox, (y + 0.7) * T + oy, 1); m.skCd = 0; return m; });
    if (!ws.every(m => A.map.monStand(m.x, m.y))) continue;
    tested++;
    const reached = new Set();
    for (let i = 0; i < 30 * 40 && reached.size < 2; i++) {
      A.p.inv = 1; A.step();
      for (const m of ws) { assert.ok(A.map.monStand(m.x, m.y), 'không đi vào nước'); if (Math.hypot(m.x - A.p.x, m.y - A.p.y) < 20) reached.add(m); }
    }
    assert.ok(reached.size >= 2, `seed ${seed}: chỉ ${reached.size}/3 con vòng qua hồ tới nơi`);
  }
  assert.ok(tested >= 2, 'đã thử ' + tested + ' hồ');
});
