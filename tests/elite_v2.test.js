// M10-07: Ma Ảnh tinh anh — Ảnh Bộ (dịch chuyển có báo đích) + Hắc Trảo (quét cung), chỉ khi run.skillsV2
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { archetypeAI, inClaw } from '../src/entities/archetypes.js';
import { ELITE_V2 as EV, PLAYER, SKILL_NAMES } from '../src/core/config.js';

const DT = 1 / 30;

function spotOK(map, x, y) {
  for (let a = 0; a < 16; a++) for (const r of [0, 40, 80, 120, 160]) {
    const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
    if (!map.canStand(px, py) || map.blocksShot(px, py + 6)) return false;
  }
  return true;
}
function runWithSpot(seed, diff = 0) {
  for (let k = 0; k < 60; k++) {
    const r = createRun({ seed: seed * 100 + k, startSkill: 'sword_qi', realmLevel: 0, difficulty: diff }), map = r.scene.map;
    for (let j = 0; j < 800; j++) { const x = map.cx + ((j * 37) % 500) - 250, y = map.cy + ((j * 53) % 400) - 200; if (spotOK(map, x, y)) return [r, { x, y }]; }
  }
  throw new Error('không có khoảng trống');
}

// Một Ma Ảnh cách người chơi `dist`; step(onTick) chạy tới `sec` giây
function duel(seed, dist, { skillsV2 = true, diff = 0, angle = 0 } = {}) {
  const [r, s] = runWithSpot(seed, diff); r.scene.monsters.length = 0;
  const sc = r.scene, map = sc.map, p = { x: s.x, y: s.y, inv: 0, dead: false };
  const m = makeRunEnemy(r, 'elite', p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist, 1); m.skCd = 0; m.blinkCd = 0; m.clawCd = 0;
  const hits = [];
  let t = 0;
  const io = { map, shots: sc.enemyShots, hazards: sc.hazards, ev: [], rng: r.rng, scene: sc, skillsV2, diff, onAttack: (mm, dmg, src) => hits.push({ t, src: src || 'elite' }) };
  const tick = () => { t += DT; const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1; archetypeAI(m, p, dx, dy, d, DT, io); m.x += m.vx * DT; m.y += m.vy * DT; };
  return { r, map, p, m, hits, tick, get t() { return t; } };
}

test('TẮT: Ma Ảnh không Ảnh Bộ, không Hắc Trảo (chỉ đập đất như cũ)', () => {
  const D = duel(1, 150, { skillsV2: false, diff: 3 });
  const seen = new Set();
  for (let i = 0; i < 30 * 12; i++) { D.tick(); seen.add(D.m.st + ':' + (D.m.sk || '')); }
  assert.ok(![...seen].some(k => k.startsWith('blink') || k.includes('claw')), [...seen].join(' '));
});

test('Ảnh Bộ: báo đích WARN giây (không dịch chuyển sớm), hiện ra ở ô đứng được, không sát người chơi, rồi sơ hở và chưa cắn ngay', () => {
  for (const seed of [1, 2, 3, 4]) {
    const D = duel(seed, 150);
    let blinkAt = -1, landAt = -1, start = null;
    for (let i = 0; i < 30 * 4 && landAt < 0; i++) {
      const was = D.m.st; D.tick();
      if (was !== 'blink' && D.m.st === 'blink') { blinkAt = D.t; start = [D.m.x, D.m.y]; }
      if (D.m.st === 'blink') assert.deepEqual([D.m.x, D.m.y], start, 'đứng yên trong lúc báo đích');
      if (was === 'blink' && D.m.st !== 'blink') landAt = D.t;
    }
    assert.ok(blinkAt > 0 && landAt > 0, `seed ${seed}: chưa Ảnh Bộ`);
    assert.ok(landAt - blinkAt >= EV.BLINK.WARN - DT * 1.5);
    assert.ok(D.map.monStand(D.m.x, D.m.y), 'hiện ra ở ô không đứng được');
    assert.ok(Math.hypot(D.m.x - D.p.x, D.m.y - D.p.y) >= EV.BLINK.MIN_PLAYER - 0.01, 'hiện ra sát người chơi');
    assert.equal(D.m.st, 'recover', 'có sơ hở sau khi hiện ra');
    // người chơi đứng sát chỗ vừa hiện ra: không bị đòn nào trong RECOVER + BITE_GRACE
    const quiet = EV.BLINK.RECOVER + EV.BLINK.BITE_GRACE - DT * 2;
    for (let i = 0; i < 30 * 2; i++) { D.p.x = D.m.x - 8; D.p.y = D.m.y; D.tick(); if (D.t - landAt < quiet) assert.equal(D.hits.length, 0, `seed ${seed}: đánh ngay khi xuất hiện`); }
  }
});

test('Ảnh Bộ có hồi chiêu: không dịch chuyển lại trước BLINK.CD', () => {
  const D = duel(2, 150);
  const blinks = [];
  for (let i = 0; i < 30 * 20; i++) {
    const was = D.m.st; D.tick();
    if (was !== 'blink' && D.m.st === 'blink') blinks.push(D.t);
    if (D.m.st === 'move' && Math.hypot(D.m.x - D.p.x, D.m.y - D.p.y) < 120) { D.m.x = D.p.x + 160; D.m.y = D.p.y; }   // kéo ra xa để nó muốn Ảnh Bộ lại
  }
  assert.ok(blinks.length >= 2, 'Ảnh Bộ ' + blinks.length + ' lần');
  for (let i = 1; i < blinks.length; i++) assert.ok(blinks[i] - blinks[i - 1] >= EV.BLINK.CD - DT * 2, blinks.join(','));
});

test('Ảnh Bộ không bao giờ hiện ra trên nước/ô không đứng được (nhiều seed, quanh hồ)', () => {
  let landed = 0;
  for (const seed of [3, 7, 11, 19, 23]) {
    const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = true; r.scene.monsters.length = 0;
    const map = r.scene.map, p = { x: map.cx, y: map.cy, inv: 1, dead: false };
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, m = makeRunEnemy(r, 'elite', p.x + Math.cos(a) * 160, p.y + Math.sin(a) * 160, 1); m.blinkCd = 0; m.spec = true; }
    for (let i = 0; i < 30 * 30; i++) {
      const a = i / 120; p.x = map.cx + Math.cos(a) * 150; p.y = map.cy + Math.sin(a) * 110; p.inv = 1;
      const st = new Map(r.scene.monsters.map(m => [m, m.st]));
      updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
      for (const m of r.scene.monsters) if (m.arch === 'elite' && st.get(m) === 'blink' && m.st !== 'blink') { landed++; assert.ok(map.monStand(m.x, m.y), `seed ${seed}: hiện ra trên ô cấm`); }
    }
  }
  assert.ok(landed >= 5, 'Ảnh Bộ ' + landed + ' lần');
});

test('Hắc Trảo (độ khó Linh+): hướng khóa; trúng khi đứng trước mặt sau gồng; không trúng khi đứng sau lưng; lùi khỏi tầm thì né được', () => {
  // đứng trước mặt, đứng yên -> trúng đúng lúc hết gồng
  for (const seed of [1, 2]) {
    const D = duel(seed, 34, { diff: 1 });
    let windAt = -1, lock = null;
    for (let i = 0; i < 30 * 3; i++) {
      const was = D.m.st; D.tick();
      if (was !== 'windup' && D.m.st === 'windup' && D.m.sk === 'claw' && windAt < 0) { windAt = D.t; lock = [D.m.dirX, D.m.dirY]; }
      if (D.m.st === 'windup' && D.m.sk === 'claw') assert.deepEqual([D.m.dirX, D.m.dirY], lock);
      if (windAt > 0 && D.m.st === 'recover') break;
    }
    assert.ok(windAt > 0, `seed ${seed}: chưa dùng Hắc Trảo`);
    const claws = D.hits.filter(h => h.src === 'elite:claw');
    assert.equal(claws.length, 1);
    assert.ok(claws[0].t >= windAt + EV.CLAW.WINDUP - DT * 1.5, 'trúng trước khi hết gồng');
  }
  // lùi thẳng ra sau trong lúc gồng -> né được
  for (const seed of [1, 2]) {
    const D = duel(seed, 34, { diff: 1 });
    let winding = false;
    for (let i = 0; i < 30 * 3; i++) {
      D.tick();
      if (D.m.st === 'windup' && D.m.sk === 'claw') { winding = true; D.p.x += D.m.dirX * PLAYER.SPEED * DT; D.p.y += D.m.dirY * PLAYER.SPEED * DT; }
      if (winding && D.m.st === 'recover') break;
    }
    assert.ok(winding); assert.equal(D.hits.filter(h => h.src === 'elite:claw').length, 0, 'lùi rồi vẫn trúng');
  }
  // hình học cung: sau lưng / ngoài tầm không trúng
  const m = { x: 0, y: 0, dirX: 1, dirY: 0 };
  assert.ok(inClaw(m, { x: 30, y: 0 }));
  assert.ok(!inClaw(m, { x: -30, y: 0 }), 'sau lưng');
  assert.ok(!inClaw(m, { x: EV.CLAW.R + 10, y: 0 }), 'ngoài tầm');
  assert.ok(!inClaw(m, { x: 0, y: 40 }), 'ngang hông ngoài cung 120°');
});

test('độ khó Phàm: không có Hắc Trảo (chỉ từ CLAW.MIN_DIFF)', () => {
  const D = duel(1, 34, { diff: 0 });
  for (let i = 0; i < 30 * 10; i++) { D.tick(); assert.notEqual(D.m.sk, 'claw'); D.p.x = D.m.x - 30; D.p.y = D.m.y; }
});

test('độ khó Linh: Ma Ảnh dùng đủ 3 kỹ năng (đập đất, Ảnh Bộ, Hắc Trảo) trong một lượt thật; nguồn sát thương có tên', () => {
  const used = new Set();
  for (const seed of [31, 32, 33]) {
    const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0, difficulty: 1 }); r.skillsV2 = true; r.tactics = true; r.scene.monsters.length = 0;
    const map = r.scene.map, p = { x: map.cx, y: map.cy, inv: 0, dead: false };
    for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283; makeRunEnemy(r, 'elite', p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150, 1).spec = true; }
    for (let i = 0; i < 30 * 40 && r.status === 'RUNNING'; i++) {
      const a = i / 150; p.x = map.cx + Math.cos(a) * 70; p.y = map.cy + Math.sin(a) * 50; p.inv = 0;
      const st = new Map(r.scene.monsters.map(m => [m, m.st + (m.sk || '')]));
      updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
      for (const m of r.scene.monsters) if (m.arch === 'elite' && st.get(m) !== m.st + (m.sk || '')) {
        if (m.st === 'blink') used.add('blink'); if (m.st === 'windup') used.add(m.sk);
      }
    }
    for (const k of Object.keys(r.dmgBy)) assert.ok(SKILL_NAMES[k], 'nguồn chưa có tên: ' + k);
  }
  assert.ok(used.has('slam') && used.has('claw') && used.has('blink'), [...used].join(','));
});
