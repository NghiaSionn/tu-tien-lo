// (23/11) Cutscene xuất hiện boss + trận boss tập trung (dọn sân, ngừng sinh quái thường)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCutscene, stepCutscene, skipCutscene, cutsceneState } from '../src/systems/cutscene.js';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { CUTSCENE, BOSS, BOSS_ARENA } from '../src/core/config.js';

const DT = 1 / 60;
const run = (c, sec) => { const ev = []; for (let i = 0; i < sec / DT && !c.done; i++) ev.push(...stepCutscene(c, DT)); return ev; };

test('dòng thời gian Lang Vương: camera từ người chơi tới boss rồi về; đứng trên cao -> hú -> nhảy -> đáp; kết thúc đúng thời lượng', () => {
  const c = createCutscene('MINI', { x: 500, y: 400 }, { x: 300, y: 380 });
  const S = CUTSCENE.MINI, T = S.T;
  let s = cutsceneState(c);
  assert.ok(Math.abs(s.focusX - 300) < 1 && s.alt === S.HIGH && s.pose === 0);
  const poses = [];
  let t = 0;
  while (!c.done) { stepCutscene(c, DT); t += DT; s = cutsceneState(c); if (poses[poses.length - 1] !== s.pose) poses.push(s.pose);
    if (c.t < T.LEAP) assert.equal(s.alt, S.HIGH, 'còn đứng trên cao');
    if (c.t >= T.LAND) assert.equal(s.alt, 0, 'đã đáp đất'); }
  assert.deepEqual(poses, [0, 1, 2, 3, 4, 5]);
  assert.ok(Math.abs(t - S.DUR) < 0.05);
  assert.ok(Math.abs(s.focusX - 300) < 1, 'camera về người chơi'); assert.ok(s.letter < 0.01 && s.name < 0.01);
});

test('mỗi sự kiện âm thanh/hiệu ứng phát đúng một lần (kể cả hai sự kiện cùng mốc)', () => {
  const c = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 });
  const ev = run(c, 10);
  assert.equal(ev.length, CUTSCENE.MINI.EVENTS.length);
  assert.equal(ev.filter(e => e.name === 'howl').length, 1); assert.equal(ev.filter(e => e.type === 'land').length, 1);
});

test('lần đầu không bỏ qua được; đã xem rồi thì bỏ qua: nhảy tới cú đáp, không phát tiếng hú', () => {
  const a = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 }, false);
  stepCutscene(a, 0.5); assert.equal(skipCutscene(a), false); assert.ok(a.t < 1);
  const b = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 }, true);
  stepCutscene(b, 0.5); assert.equal(skipCutscene(b), true);
  const ev = run(b, 10);
  assert.ok(!ev.some(e => e.name === 'howl'), 'không phát tiếng hú khi bỏ qua');
  assert.equal(ev.filter(e => e.type === 'land').length, 1, 'vẫn có cú đáp đất');
  assert.ok(b.done);
});

test('boss xuất hiện: dọn sạch quái thường (không tính giết, không rơi kinh nghiệm), phát bossIntro đúng 1 lần, không sinh quái thường khi boss còn sống', () => {
  assert.ok(BOSS_ARENA.CLEAR_FIELD && BOSS_ARENA.NO_SPAWN);
  const r = createRun({ seed: 9, startSkill: 'sword_qi', realmLevel: 0 }); r.scene.monsters.length = 0;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false };
  for (let k = 0; k < 12; k++) makeRunEnemy(r, 'chaser', p.x + 200 + k * 6, p.y + 40, 1);
  r.scene.enemyShots.push({ x: 1, y: 1, vx: 0, vy: 0, life: 9, dmg: 1 });
  r.time = BOSS.MINI.AT - 0.01;
  const intros = [];
  let atIntro = null;
  for (let i = 0; i < 30 * 40; i++) {
    const k0 = r.kills, x0 = r.xp, o0 = r.scene.orbs.length, ev = [];
    p.inv = 1; updateRun(r, p, 1 / 30, ev); r.hp = r.maxHp; r.pendingDrafts = 0;
    const got = ev.filter(e => e.type === 'bossIntro');
    if (got.length) { intros.push(...got); atIntro = { dk: r.kills - k0, dx: r.xp - x0, dorbs: r.scene.orbs.length - o0, left: r.scene.monsters.filter(m => !m.boss).length, shots: r.scene.enemyShots.length }; }
    if (r.dir.mini === 'ALIVE') assert.ok(r.scene.monsters.every(m => m.boss || m.summoned), 'quái thường xuất hiện trong trận boss');
  }
  assert.equal(intros.length, 1); assert.equal(intros[0].kind, 'MINI');
  assert.deepEqual(atIntro, { dk: 0, dx: 0, dorbs: 0, left: 0, shots: 0 }, 'dọn sân: không tính giết, không kinh nghiệm/chiến ý, không còn quái thường/đạn');
});
