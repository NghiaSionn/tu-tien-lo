// M7-13: chiêu phối của 2 boss — chỉ từ độ khó Linh, cảnh báo ≥ 0,5 s, giữa vòng Lao Tù an toàn, boss chết thì không nổ gì nữa
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { bossAI } from '../src/entities/bosses.js';
import { BOSS, FEATURES } from '../src/core/config.js';

const newRun = (diff, seed = 77) => createRun({ seed, startSkill: 'sword_qi', realmLevel: 0, difficulty: diff });
const player = r => ({ x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0 });
const io = (r, p, extra = {}) => ({ map: r.scene.map, shots: r.scene.enemyShots, hazards: r.scene.hazards, ev: [], rng: r.rng, onAttack() {}, summon: () => 0, player: p, time: r.time, ...extra });
// đưa boss tới lúc ra chiêu kế tiếp có tên pat (bỏ qua các chiêu trước trong chuỗi)
function castUntil(m, r, p, pat, o) {
  for (let k = 0; k < 10; k++) {
    m.st = 'move'; m.gapT = 0;
    const d = 200, dx = 200, dy = 0;
    bossAI(m, p, dx, dy, d, 1 / 30, o);
    if (m.pat === pat) return true;
    r.scene.hazards.length = 0; r.scene.enemyShots.length = 0;
  }
  return false;
}

test('chiêu phối chỉ có từ độ khó Linh (Phàm giữ nguyên) và tắt được bằng cờ', () => {
  const p = { x: 0, y: 0 };
  assert.equal(makeBoss(newRun(0), 'MINI', 400, 400, 1).remix, false);
  assert.equal(makeBoss(newRun(1), 'MINI', 400, 400, 1).remix, true);
  assert.equal(makeBoss(newRun(3), 'FINAL', 400, 400, 1).remix, true);
  FEATURES.bossRemix = false;
  try { assert.equal(makeBoss(newRun(2), 'FINAL', 400, 400, 1).remix, false); } finally { FEATURES.bossRemix = true; }
  void p;
});

test('Lang Vương "Hú bầy rồi lao": hú có cảnh báo, gọi bầy, rồi 2 cú lao mỗi cú gồng ≥ 0,5 s', () => {
  const r = newRun(1), p = player(r);
  const m = makeBoss(r, 'MINI', p.x + 200, p.y, 1);
  let summoned = 0;
  const o = io(r, p, { summon: (b, n) => { summoned += n; return n; } });
  assert.ok(castUntil(m, r, p, 'howlDash', o));
  assert.equal(m.st, 'windup'); assert.ok(m.stMax >= 0.5);
  m.stT = 0; bossAI(m, p, -200, 0, 200, 1 / 30, o);       // hết gồng hú
  assert.equal(summoned, BOSS.MINI.HOWL.N);
  assert.equal(m.pat, 'dash'); assert.equal(m.st, 'windup'); assert.ok(m.stMax >= 0.5, 'cú lao vẫn có cảnh báo');
  assert.equal(m.dashLeft, BOSS.MINI.REMIX.HOWL_DASH.COUNT);
});

test('Ma Ảnh Lao Tù: vòng vùng nổ quanh người chơi, gồng ≥ 0,5 s, giữa vòng an toàn; nổ xong bắn đạn thưa', () => {
  const r = newRun(1), p = player(r), P = BOSS.FINAL.REMIX.PRISON;
  const m = makeBoss(r, 'FINAL', p.x + 200, p.y, 1);
  const o = io(r, p);
  assert.ok(castUntil(m, r, p, 'prison', o));
  const hz = r.scene.hazards;
  assert.equal(hz.length, P.N);
  for (const h of hz) {
    assert.ok(h.t >= 0.5 && h.max >= 0.5);
    assert.ok(Math.abs(Math.hypot(h.x - p.x, h.y - p.y) - P.RING) < 1e-6);
    assert.ok(Math.hypot(h.x - p.x, h.y - p.y) > h.r, 'đứng giữa vòng không bị trúng');
  }
  m.stT = 0; bossAI(m, p, -200, 0, 200, 1 / 30, o);
  assert.equal(r.scene.enemyShots.length, P.BURST_N);
  assert.equal(m.st, 'recover');
});

test('boss chết giữa lúc gồng Lao Tù: không còn vùng nổ hay đạn nào sau đó', () => {
  const r = newRun(2), p = player(r);
  r.time = BOSS.FINAL.AT; r.dir.mini = 'DEAD';
  const m = makeBoss(r, 'FINAL', p.x + 200, p.y, 1); r.dir.final = 'ALIVE';
  assert.ok(castUntil(m, r, p, 'prison', io(r, p)));
  assert.ok(r.scene.hazards.length > 0);
  m.hp = 0; m.dead = true;
  p.inv = 1; updateRun(r, p, 1 / 30, []);
  assert.equal(r.scene.hazards.length, 0);
  assert.equal(r.scene.enemyShots.filter(s => s.kind === 'dark').length, 0);
});
