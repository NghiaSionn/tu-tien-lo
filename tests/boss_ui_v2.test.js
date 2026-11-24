// M10-11: UI/SFX boss — tên chiêu, dấu pha, tiếng cảnh báo có giới hạn (chỉ khi run.bossV2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { BOSS_SKILLS } from '../src/systems/tactics.js';
import { BOSS, BOSS_SKILL_LABELS } from '../src/core/config.js';
import { unlockAudio, applyAudioSettings, play, SOUND_NAMES, GAP, _resetForTest } from '../src/audio/sfx.js';

const DT = 1 / 30;

test('mọi chiêu của bộ boss mới đều có tên hiển thị + màu', () => {
  for (const list of [BOSS_SKILLS.MINI_V2, BOSS_SKILLS.FINAL_V2]) for (const s of list) {
    const L = BOSS_SKILL_LABELS[s.id];
    assert.ok(L && L[0] && /^#[0-9a-f]{6}$/i.test(L[1]), 'thiếu tên/màu: ' + s.id);
  }
  // mỗi chiêu boss cuối một tên riêng (người xem phân biệt được bằng chữ) — 24/11: thêm Triệu Ma Ảnh -> 8 chiêu; đợt 2 thêm 7 chiêu pha 2 -> 15
  assert.equal(BOSS_SKILLS.FINAL_V2.length, 15);
  assert.equal(BOSS_SKILLS.MINI_V2.length, 11);
  assert.equal(new Set(BOSS_SKILLS.FINAL_V2.map(s => BOSS_SKILL_LABELS[s.id][0])).size, BOSS_SKILLS.FINAL_V2.length);
});

function fight(kind, on, sec = 40) {
  const r = createRun({ seed: 51, startSkill: 'sword_qi', realmLevel: 0, difficulty: 1 }); r.bossV2 = on; r.tactics = on;
  r.scene.monsters.length = 0; r.time = BOSS[kind].AT; r.dir[kind === 'MINI' ? 'mini' : 'final'] = 'ALIVE'; if (kind === 'FINAL') r.dir.mini = 'DEAD';
  const map = r.scene.map, p = { x: map.cx, y: map.cy, inv: 1, dead: false };
  const b = makeBoss(r, kind, p.x + 100, p.y, 1); b.remix = true;
  const sfx = [], starts = [];
  for (let i = 0; i < sec / DT && r.status === 'RUNNING' && !b.dead; i++) {
    b.hp = Math.max(1, Math.round(b.max * Math.max(0.3, 1 - i * DT / 20)));
    for (const m of r.scene.monsters) if (!m.boss) m.dead = true;
    const a = i / 60; p.x = map.cx + Math.cos(a) * 70; p.y = map.cy + Math.sin(a) * 50; p.inv = 1;
    const st = b.st, ev = [];
    updateRun(r, p, DT, ev); r.hp = r.maxHp; r.pendingDrafts = 0;
    for (const e of ev) if (e.type === 'sfx' && (e.name === 'bossWarn' || e.name === 'bossPhase')) sfx.push({ name: e.name, t: i * DT });
    if (st === 'move' && b.st !== 'move' && b.st !== 'recover') starts.push(i * DT);
  }
  return { b, sfx, starts };
}

test('BẬT: mỗi lần boss ra chiêu có sự kiện tiếng báo; chuyển pha có đúng 1 tiếng chuyển pha; thanh máu biết pha (m.v2)', () => {
  for (const kind of ['MINI', 'FINAL']) {
    const f = fight(kind, true);
    assert.ok(f.b.v2, kind + ': chưa đánh dấu bộ chiêu mới');
    assert.ok(f.sfx.filter(s => s.name === 'bossWarn').length >= f.starts.length - 1, `${kind}: ${f.sfx.length} tiếng / ${f.starts.length} chiêu`);
    assert.equal(f.sfx.filter(s => s.name === 'bossPhase').length, 1, kind + ': tiếng chuyển pha');
  }
});

test('TẮT: không có tiếng báo ra chiêu, boss không đánh dấu v2; (24/11) biến hình pha 2 vẫn có, tiếng chuyển pha tối đa 1 lần', () => {
  for (const kind of ['MINI', 'FINAL']) {
    const f = fight(kind, false, 25);
    assert.equal(f.sfx.filter(s => s.name === 'bossWarn').length, 0); assert.ok(f.sfx.filter(s => s.name === 'bossPhase').length <= 1); assert.ok(!f.b.v2);
  }
});

test('tiếng báo boss không chồng quá mức: khoảng nghỉ ≥ 0,6 s; tiếng chuyển pha ≥ 1,5 s', () => {
  assert.ok(SOUND_NAMES.includes('bossWarn') && SOUND_NAMES.includes('bossPhase'));
  assert.ok(GAP.bossWarn >= 0.6 && GAP.bossPhase >= 1.5);
  // AudioContext giả: phát dồn 10 lần trong 0,5 s chỉ ra 1 tiếng
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), type: '' });
  let ctx;
  const Fake = function () { ctx = { currentTime: 0, sampleRate: 8000, destination: node(), createGain: node, createBiquadFilter: node,
    createOscillator: () => ({ ...node(), start() {}, stop() {}, onended: null }), createBufferSource: () => ({ ...node(), buffer: null, start() {}, stop() {}, onended: null }),
    createBuffer: (c, len) => ({ getChannelData: () => new Float32Array(len) }) }; return ctx; };
  _resetForTest(); unlockAudio(Fake); applyAudioSettings({ sfx: 1, music: 0, mute: false });
  let n = 0;
  for (let i = 0; i < 10; i++) { ctx.currentTime += 0.05; if (play('bossWarn')) n++; }
  assert.equal(n, 1);
  _resetForTest();
});
