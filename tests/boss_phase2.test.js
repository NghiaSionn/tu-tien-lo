// (24/11, người phát triển yêu cầu) Biến hình chuyển pha 2: cả hai boss, AI cũ (cờ tắt) lẫn bộ chiêu mới.
// Tụt dưới ngưỡng -> đứng yên ANIM giây, không nhận sát thương, bùng nổ đúng 1 lần (không sát thương người chơi) -> sơ hở -> đánh tiếp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { damageMonster } from '../src/entities/monsters.js';
import { BOSS, BOSS_P2 } from '../src/core/config.js';

const DT = 1 / 30;
function arena(kind, bossV2 = false) {
  const r = createRun({ seed: 31, startSkill: 'sword_qi', realmLevel: 0 });
  r.scene.map.tiles.fill(0); r.scene.monsters.length = 0; r.bossV2 = bossV2;
  r.dir.mini = kind === 'MINI' ? 'ALIVE' : 'DEAD'; r.dir.final = kind === 'FINAL' ? 'ALIVE' : 'PENDING';
  r.time = BOSS[kind].AT + 1;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 1, dead: false };
  const b = makeBoss(r, kind, p.x - 400, p.y, 1);   // xa người chơi: kiếm khí không chạm
  const hits = [];
  const step = (ev = []) => { p.inv = 1; const h0 = r.hp; updateRun(r, p, DT, ev); if (r.hp < h0) hits.push(h0 - r.hp); r.hp = r.maxHp; r.pendingDrafts = 0; return ev; };
  return { r, p, b, step, hits };
}

for (const kind of ['MINI', 'FINAL']) for (const v2 of [false, true]) {
  test(`${kind} (${v2 ? 'bộ chiêu mới' : 'AI cũ'}): biến hình pha 2 — không nhận sát thương, bùng nổ 1 lần, xong thì sơ hở, không biến hình lại`, () => {
    const P = BOSS_P2[kind], { b, step } = arena(kind, v2);
    step();
    assert.notEqual(b.st, 'phase'); assert.ok(!b.p2);
    b.hp = Math.floor(b.max * Math.min(P.AT, 0.45));
    const ev = [];
    for (let i = 0; i < 10 && b.st !== 'phase'; i++) step(ev);
    assert.equal(b.st, 'phase'); assert.ok(b.p2);
    assert.ok(ev.some(e => e.type === 'bossPhase2' && e.kind === kind));
    const hp0 = b.hp;
    assert.equal(damageMonster(b, 999, null), false); assert.equal(b.hp, hp0, 'đang biến hình: không mất máu');
    let t = 0, bursts = 0;
    while (b.st === 'phase' && t < 5) { const e = step([]); bursts += e.filter(x => x.type === 'boom').length; t += DT; }
    assert.ok(Math.abs(t - P.ANIM) < 0.1, `biến hình ${t.toFixed(2)} giây`);
    assert.equal(bursts, 1, 'bùng nổ đúng 1 lần');
    assert.equal(b.st, 'recover'); assert.ok(b.vuln > 0, 'xong biến hình thì sơ hở');
    assert.ok(damageMonster(b, 5, null) === false && b.hp < hp0, 'hết biến hình: nhận sát thương lại');
    for (let i = 0; i < 300; i++) { const e = step([]); assert.ok(!e.some(x => x.type === 'bossPhase2'), 'không biến hình lại'); }
  });
}

test('bùng nổ biến hình chỉ là hiệu ứng: người chơi đứng sát cũng không mất máu trong lúc biến hình', () => {
  const { r, p, b, step, hits } = arena('FINAL');
  b.x = p.x + 30; b.y = p.y; b.hp = Math.floor(b.max * 0.4);
  r.scene.hazards.length = 0; r.scene.enemyShots.length = 0;
  for (let i = 0; i < 10 && b.st !== 'phase'; i++) step();
  hits.length = 0;
  while (b.st === 'phase') step();
  assert.deepEqual(hits, []);
});
