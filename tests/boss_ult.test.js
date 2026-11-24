// (24/11) Tuyệt chiêu mỗi boss: Lang Vương "Vạn Lang Ảnh Sát Trận" (vòng 8 phân thân nhốt, từng đợt lao xuyên vòng),
// Yêu Vương "U Minh Vạn Nhãn Kiếp" (bóng tối, mắt đỏ bắn tia / đạn, mắt giả). Chỉ pha 2, không miễn nhiễm, tối đa MAX lần, hồi CD.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { dangerShapes, hits } from '../src/systems/tactics.js';
import { BOSS, BOSS_ULT, PLAYER, SKILL_NAMES, ARCH } from '../src/core/config.js';

const DT = 1 / 30;
function fight(kind, seed, { move, hp = 0.29, p2 = true } = {}) {   // dưới cả hai mốc (35 % / 30 %)
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 3 });
  r.time = BOSS[kind].AT - 0.5; if (kind === 'FINAL') r.dir.mini = 'DEAD';
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 0, dead: false, fx: 1, fy: 0 };
  let b = null;
  const step = (n = 1, ev = []) => {
    for (let i = 0; i < n && r.status === 'RUNNING'; i++) {
      if (!b) { b = r.scene.monsters.find(m => m.boss && !m.dead); if (b) { b.p2 = p2; b.tkDone = { 0.7: true, 0.4: true, 0.15: true }; b.hp = Math.round(b.max * hp); } }
      if (move) move(p, r, b);
      p.inv = Math.max(0, p.inv - DT);
      updateRun(r, p, DT, ev); r.hp = r.maxHp; r.pendingDrafts = 0;
    }
    return ev;
  };
  return { r, p, step, boss: () => b };
}

test('tuyệt chiêu chỉ ở pha 2 dưới mốc máu; xong thì choáng; hồi CD; tối đa MAX lần', () => {
  for (const kind of ['MINI', 'FINAL']) {
    const U = BOSS_ULT[kind];
    const f = fight(kind, 1, { hp: U.AT + 0.05 }); f.step(30 * 6);
    assert.ok(!f.boss().ultN && !f.boss().ult, kind + ': trên mốc máu không dùng');
    const g = fight(kind, 2); const ev = g.step(30 * 3);
    const b = g.boss();
    assert.ok(b.ult && b.st === 'ult', kind + ': bật'); assert.ok(ev.some(e => e.type === 'ultStart'));
    for (let i = 0; i < 30 * 14 && b.ult; i++) g.step(1);
    assert.equal(b.ultN, 1); assert.ok(b.vuln > 0 && b.st === 'recover', 'choáng sau khi xong');
    g.step(30 * 5); assert.ok(!b.ult, 'đang hồi CD');
    b.ultAt = b.age - U.CD; for (let i = 0; i < 30 * 6 && !b.ult; i++) g.step(1); assert.ok(b.ult, 'hết CD dùng lại');
    for (let i = 0; i < 30 * 14 && b.ult; i++) g.step(1); assert.equal(b.ultN, 2);
    b.ultAt = b.age - U.CD - 1; g.step(30 * 3); assert.ok(!b.ult && b.ultN === U.MAX, 'tối đa MAX lần');
  }
});

// Bot né: mỗi khung, nếu đang ở trong hình nguy hiểm (vùng / tia đang báo, vệt đạn sắp bắn, đạn đang bay tới) thì đi
// tới chỗ an toàn gần nhất (Lang Vương: trong vòng vây) với 0,8 × tốc độ đi bộ (trừ phản ứng). Công bằng = bot không trúng đòn.
function dodgeBot(p, r, b) {
  if (!b || !b.ult) return;
  const u = b.ult, ds = dangerShapes(r.scene, p);
  // đạn trúng khi |(người.x, người.y - 7) - đạn| < SHOT_R -> trong toạ độ chân người chơi, tâm nguy hiểm dời xuống 7 px
  for (const e of u.eyes) if (e.kind === 'shot' && !e.fired) { const ux = e.tx - e.x, uy = e.ty - e.y, l = Math.hypot(ux, uy) || 1; ds.push({ x0: e.x, y0: e.y + 7, x1: e.x + ux / l * 400, y1: e.y + 7 + uy / l * 400, w: ARCH.ranged.SHOT_R + 4 }); }
  for (const sh of r.scene.enemyShots) for (let k = 0; k <= 4; k++) ds.push({ x: sh.x + sh.vx * k * 0.08, y: sh.y + 7 + sh.vy * k * 0.08, r: ARCH.ranged.SHOT_R + 4 });
  const ok = (x, y) => (u.cx === undefined || Math.hypot(x - u.cx, y - u.cy) <= u.R - 8) && r.scene.map.canStand(x, y) && !ds.some(sh => hits(sh, x, y));
  if (ok(p.x, p.y)) return;
  let best = null;
  for (const rr of [4, 8, 14, 20, 28, 36, 46, 58, 72, 90, 110]) { for (let j = 0; j < 24; j++) { const a = j / 24 * Math.PI * 2, x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr; if (ok(x, y)) { best = [x, y]; break; } } if (best) break; }
  if (!best) return;
  const dx = best[0] - p.x, dy = best[1] - p.y, l = Math.hypot(dx, dy), st = Math.min(l, PLAYER.SPEED * 0.8 * DT);
  p.x += dx / l * st; p.y += dy / l * st;
}
test('bot né (0,8 × tốc độ đi bộ) qua trọn tuyệt chiêu không trúng đòn nào — mọi đợt né được bằng đi bộ', () => {
  for (const kind of ['MINI', 'FINAL']) for (const seed of [1, 2, 3, 4, 5]) {
    const f = fight(kind, seed, { move: dodgeBot });
    let started = false, waves = 0;
    for (let i = 0; i < 30 * 16; i++) { f.step(1); const b = f.boss(); if (b && b.ult) { started = true; waves = b.ult.i; } else if (started) break; }
    assert.ok(started && waves >= 10, kind + ' seed ' + seed + ': chạy đủ đợt (' + waves + ')');
    const src = kind === 'MINI' ? 'miniboss:ult' : 'boss:ultEye';
    assert.ok(!(f.r.dmgBy[src] > 0), `${kind} seed ${seed}: bot né vẫn trúng ${f.r.dmgBy[src]}`);
  }
});

test('Lang Vương: 8 phân thân quanh vòng, người chơi bị giữ trong vòng, đứng yên thì trúng', () => {
  const f = fight('MINI', 3, { move: (p, r, b) => { if (b && b.ult && b.ult.cx !== undefined) p.x += 6; } });
  let maxD = 0, ring = null;
  for (let i = 0; i < 30 * 12; i++) { f.step(1); const b = f.boss(); if (b && b.ult) { ring = b.ult; if (ring.t < BOSS_ULT.MINI.DUR - 1.3) maxD = Math.max(maxD, Math.hypot(f.p.x - ring.cx, f.p.y - ring.cy)); } }   // 1,2 s cuối vòng tan
  assert.ok(ring && ring.clones.length === 8);
  assert.ok(maxD <= ring.R - 5, 'bị giữ trong vòng: ' + maxD.toFixed(1));
  const g = fight('MINI', 3); g.step(30 * 12);
  assert.ok(g.r.dmgBy['miniboss:ult'] > 0 && SKILL_NAMES['miniboss:ult'], 'đứng yên trúng đòn lao');
});

test('Yêu Vương (làm lại): mắt khóa chỗ người chơi sau LOCK -> vòng ma trảo tròn ở đó; có vùng sáng phụ; boss chết giữa chừng thì hủy hết', () => {
  const U = BOSS_ULT.FINAL, f = fight('FINAL', 2);
  let checked = 0, lights = 0, claws = 0;
  for (let i = 0; i < 30 * 13; i++) {
    const before = new Set(f.r.scene.hazards);
    f.step(1); const b = f.boss(); if (!b || !b.ult) continue;
    for (const h of f.r.scene.hazards) if (!before.has(h) && h.src === 'boss:ultEye') {
      assert.equal(h.x0, undefined, 'vòng tròn, không phải dải'); assert.equal(h.r, U.CLAW_R);
      assert.ok(Math.hypot(h.x - f.p.x, h.y - f.p.y) <= 45, 'đặt ở (quanh) chỗ người chơi lúc khóa (bù tối đa ~43 px)');
      checked++;
    }
    lights = Math.max(lights, b.ult.lights.length); claws = Math.max(claws, b.ult.claws.length);
  }
  assert.ok(checked >= 10, 'đủ vòng ma trảo: ' + checked); assert.ok(lights >= 1, 'có vùng sáng phụ'); assert.ok(claws >= 1, 'ma trảo trồi');
  const g = fight('FINAL', 3); g.step(30 * 4);
  const b = g.boss(); assert.ok(b.ult);
  b.hp = 1; b.vuln = 0; b.dead = true; g.step(2);
  assert.equal(g.r.scene.hazards.length, 0, 'boss chết: không còn vùng nổ');
});

test('Lang Vương: boss thật đứng TRONG vòng (vị trí 0) cùng 7 phân thân; vòng bán kính 120 khi đủ chỗ', () => {
  const f = fight('MINI', 1); f.step(30 * 3);
  const b = f.boss(); assert.ok(b.ult);
  const u = b.ult, r = Math.hypot(b.x - u.cx, b.y - u.cy);
  assert.ok(Math.abs(r - u.R) < 2, 'boss trên vòng: ' + r.toFixed(1)); assert.ok(u.clones[0].real);
  assert.ok(u.R >= 80 && u.R <= BOSS_ULT.MINI.R);
});
