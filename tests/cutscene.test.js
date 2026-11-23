// (23/11) Cutscene xuất hiện boss + trận boss tập trung (dọn sân, ngừng sinh quái thường)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCutscene, stepCutscene, skipCutscene, cutsceneState } from '../src/systems/cutscene.js';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy } from '../src/systems/director.js';
import { CUTSCENE, BOSS, BOSS_ARENA } from '../src/core/config.js';

const DT = 1 / 60;
const run = (c, sec) => { const ev = []; for (let i = 0; i < sec / DT && !c.done; i++) ev.push(...stepCutscene(c, DT)); return ev; };

test('dòng thời gian Lang Vương: ngửa trời + tối dần -> vách sáng dần, sói hiện ra, bước tới mỏm, nhìn, hú, phóng -> tối dần -> đấu trường, rơi, đáp; về người chơi', () => {
  const c = createCutscene('MINI', { x: 500, y: 400 }, { x: 300, y: 380 });
  const S = CUTSCENE.MINI, T = S.T;
  let s = cutsceneState(c);
  assert.ok(Math.abs(s.focusX - 300) < 1 && Math.abs(s.focusY - 380) < 1 && s.fade === 0 && s.bg === 0 && s.cliff === null && s.alt < 0);
  const frames = [], poses = [];
  let t = 0, prev = s, sawBlack = 0;
  while (!c.done) {
    stepCutscene(c, DT); t += DT; s = cutsceneState(c);
    const f = s.cliff && s.cliff.frame.replace(/^w\d+$/, 'walk');
    if (f && frames[frames.length - 1] !== f) frames.push(f);
    if (s.alt >= 0 && poses[poses.length - 1] !== s.pose) poses.push(s.pose);
    assert.ok(Math.abs(s.fade - prev.fade) < 0.1, 'màn đen chuyển cảnh không giật');
    if (s.fade < 0.95 && prev.fade < 0.95 && s.bg === prev.bg) {   // còn nhìn thấy: camera không được nhảy
      assert.ok(Math.hypot(s.focusX - prev.focusX, s.focusY - prev.focusY) < 12, `camera đấu trường nhảy lúc t=${c.t.toFixed(2)}`);
      assert.ok(Math.abs(s.sky - prev.sky) <= 6, `camera vách nhảy lúc t=${c.t.toFixed(2)}`);
    }
    if (s.bg !== prev.bg) { assert.ok(s.fade > 0.97 || prev.fade > 0.97, 'đổi cảnh chỉ khi màn hình đen'); sawBlack++; }
    if (c.t >= T.CLIFF && c.t < T.ARENA) assert.ok(s.alt < 0, 'chưa xuống đấu trường');
    if (c.t >= T.LAND) assert.equal(s.alt, 0, 'đã đáp đất');
    prev = s;
  }
  assert.equal(sawBlack, 2, 'vào cảnh vách và trở lại đấu trường đều qua màn đen');
  assert.deepEqual(frames, ['i0', 'walk', 'i0', 'i1', 'i2', 'i3', 'i4']);
  assert.deepEqual(poses, [4, 5]);
  assert.ok(Math.abs(t - S.DUR) < 0.05);
  assert.ok(Math.abs(s.focusX - 300) < 1 && Math.abs(s.focusY - 380) < 1, 'camera về người chơi'); assert.ok(s.letter < 0.01 && s.name < 0.01 && s.fade < 0.01);
});

test('sói bước chậm có uy và KHÔNG trượt chân: thân tiến đúng STRIDE/FRAMES mỗi khung, chỉ khi đổi khung; tiếng dậm đúng khung chân trước đặt xuống', () => {
  const S = CUTSCENE.MINI, T = S.T, C = S.CLIFF, Wk = S.WALK;
  const speed = Wk.STRIDE * Wk.FPS / Wk.FRAMES;
  assert.ok(speed <= 45, `đi quá nhanh: ${speed.toFixed(0)} px/giây`);
  const c = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 });
  const at = sec => { c.t = sec; return cutsceneState(c).cliff; };
  const N = Wk.CYCLES * Wk.FRAMES;
  for (let f = 0; f < N; f++) {
    const a = at(T.WALK + (f + 0.5) / Wk.FPS), b = at(T.WALK + (f + 0.95) / Wk.FPS);
    assert.equal(a.frame, 'w' + (f % Wk.FRAMES));
    assert.ok(Math.abs((a.x - C.START_X) * 640 - f * Wk.STRIDE / Wk.FRAMES) < 1e-6, `khung ${f} lệch sải`);
    assert.equal(a.x, b.x, 'trong một khung thân đứng yên (chân không trượt)');
  }
  assert.ok(Math.abs(at(T.LOOK - 1e-6).x - C.TIP_X) < 1e-4, 'tới đúng mỏm đá');
  const steps = S.EVENTS.filter(([, e]) => e.name === 'thud').map(([t]) => t);
  assert.equal(steps.length, Wk.CYCLES * Wk.CONTACT.length);
  for (const t of steps) assert.ok(Wk.CONTACT.includes(+at(t + 1e-3).frame.slice(1)), 'dậm đúng khung chân trước đặt xuống');
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] - steps[i - 1] >= 0.4);
  assert.ok(steps.every(t => t > T.WALK && t < T.LOOK), 'chỉ dậm lúc đang bước');
});

test('mỗi sự kiện âm thanh/hiệu ứng phát đúng một lần (kể cả hai sự kiện cùng mốc)', () => {
  const c = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 });
  const ev = run(c, 30);
  assert.equal(ev.length, CUTSCENE.MINI.EVENTS.length);
  assert.equal(ev.filter(e => e.name === 'howl').length, 1); assert.equal(ev.filter(e => e.type === 'land').length, 1);
});

test('lần đầu không bỏ qua được; đã xem rồi thì bỏ qua: nhảy tới cú đáp, không phát tiếng hú', () => {
  const a = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 }, false);
  stepCutscene(a, 0.5); assert.equal(skipCutscene(a), false); assert.ok(a.t < 1);  // lần đầu: phải xem hết
  const b = createCutscene('MINI', { x: 0, y: 0 }, { x: 0, y: 0 }, true);
  stepCutscene(b, 0.5); assert.equal(skipCutscene(b), true);
  const ev = run(b, 30);
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
