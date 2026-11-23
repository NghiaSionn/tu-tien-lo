// M10-02: bộ chọn chiêu theo tình huống + ngân sách đe dọa (FEATURES.enemyTactics / run.tactics)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss, inCameraView } from '../src/systems/director.js';
import { BOSS, TACTICS, RUN, FEATURES } from '../src/core/config.js';
import { selectBossSkill, BOSS_SKILLS } from '../src/systems/tactics.js';

const newRun = (seed, tactics, o = {}) => { const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0, ...o }); if (tactics !== undefined) r.tactics = tactics; return r; };
const player = r => ({ x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0, dead: false });
// người chơi đi vòng theo kịch bản cố định, bất tử (để đo AI chứ không đo sống chết)
function play(r, p, seconds, each) {
  const dt = 1 / 30;
  for (let i = 0; i < Math.round(seconds / dt) && r.status === 'RUNNING'; i++) {
    const a = i / 90; p.x = r.scene.map.cx + Math.cos(a) * 60; p.y = r.scene.map.cy + Math.sin(a) * 40; p.inv = 1;
    updateRun(r, p, dt, []); r.hp = r.maxHp; r.pendingDrafts = 0;
    if (each) each(r, p);
  }
}
const snapshot = r => JSON.stringify({ t: r.time.toFixed(3), kills: r.kills, skills: r.skillsUsed,
  ms: r.scene.monsters.map(m => [Math.round(m.x), Math.round(m.y), m.st, m.pat || '']), shots: r.scene.enemyShots.length, hz: r.scene.hazards.length });

test('cờ mặc định TẮT; TẮT tường minh giống hệt mặc định (AI M9 không đổi)', () => {
  assert.equal(FEATURES.enemyTactics, false);
  const a = newRun(77), b = newRun(77, false), pa = player(a), pb = player(b);
  a.time = b.time = 200; play(a, pa, 40); play(b, pb, 40);
  assert.equal(snapshot(a), snapshot(b));
});

test('BẬT: cùng seed + cùng input -> cùng chuỗi chiêu và cùng trạng thái quái (tất định)', () => {
  const runs = [newRun(4242, true), newRun(4242, true)];
  for (const r of runs) { r.time = BOSS.MINI.AT - 1; play(r, player(r), 60); }
  assert.equal(snapshot(runs[0]), snapshot(runs[1]));
  assert.ok(Object.keys(runs[0].skillsUsed).some(k => k.startsWith('MINI:')), 'Lang Vương đã ra chiêu: ' + JSON.stringify(runs[0].skillsUsed));
});

test('Yêu Vương không spam Chấn Địa khi người chơi đứng sát; không chiêu nào quá 2 lần liên tiếp', () => {
  const r = newRun(9, true), p = player(r);
  r.time = BOSS.FINAL.AT; r.dir.final = 'ALIVE'; r.dir.mini = 'DEAD';
  const boss = makeBoss(r, 'FINAL', p.x + 20, p.y, 1); boss.hp = boss.max = 1e9;
  const seq = [];
  for (let i = 0; i < 30 * 90 && r.status === 'RUNNING'; i++) {   // 90 s đứng sát boss
    p.x = boss.x - 10; p.y = boss.y; p.inv = 1;
    const before = boss.pat, st = boss.st;
    updateRun(r, p, 1 / 30, []); r.hp = r.maxHp; r.pendingDrafts = 0;
    if (st === 'move' && boss.st === 'windup') seq.push(boss.pat);
    void before;
  }
  const slams = seq.filter(s => s === 'slam').length;
  assert.ok(seq.length >= 8, 'boss ra đủ chiêu: ' + seq.join(','));
  assert.ok(slams <= Math.ceil(90 / TACTICS.SKILL_CD.FINAL.slam) + 1, `slam ${slams} lần / ${seq.length}`);
  for (let i = 2; i < seq.length; i++) assert.ok(!(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]), 'lặp 3 lần: ' + seq.join(','));
  assert.ok(new Set(seq).size >= 2, 'đổi chiêu: ' + seq.join(','));
});

test('chiêu không hợp lệ không được chọn (Lao Tù khi không remix, hú khi đàn đã đủ)', () => {
  const r = newRun(5, true), p = player(r);
  const io = { rng: r.rng, hazards: [], scene: r.scene, threat: null };
  const fin = makeBoss(r, 'FINAL', p.x + 200, p.y, 1); fin.remix = false;
  for (let i = 0; i < 200; i++) assert.notEqual(selectBossSkill(fin, BOSS.FINAL, 200, io, p, true), 'prison');
  const mini = makeBoss(r, 'MINI', p.x + 200, p.y, 1);
  for (let i = 0; i < TACTICS.MAX_SUMMONED; i++) { const w = makeBoss(r, 'MINI', p.x, p.y, 1); w.boss = false; w.summoned = true; }
  for (let i = 0; i < 200; i++) assert.notEqual(selectBossSkill(mini, BOSS.MINI, 200, io, p, false), 'howl');
  assert.ok(BOSS_SKILLS.MINI.length >= 3 && BOSS_SKILLS.FINAL.length >= 4);
});

test('ngân sách đe dọa: trong khung nhìn không quá NORMAL đòn đặc biệt quái thường cùng gồng/lao; không vượt trần đạn/vùng', () => {
  for (const seed of [1, 2, 3]) {
    const r = newRun(seed, true), p = player(r);
    r.time = 240; r.dir.mini = 'DEAD';   // (23/11) không cho boss ra: trận boss giờ dọn sân + ngừng sinh quái
    let maxSeen = 0;
    play(r, p, 90, (r, p) => {
      let n = 0;
      for (const m of r.scene.monsters) if (!m.dead && !m.boss && (m.st === 'windup' || m.st === 'dash') && inCameraView(r.scene.map, p, m.x, m.y, 0)) n++;
      maxSeen = Math.max(maxSeen, n);
      assert.ok(r.scene.enemyShots.length <= RUN.MAX_ENEMY_SHOTS);
      assert.ok(r.scene.hazards.length <= (BOSS.FINAL.MAX_HAZARDS || 12));
    });
    // +1: quái đang gồng sát mép có thể trôi vào khung nhìn sau khi giữ chỗ
    assert.ok(maxSeen <= TACTICS.BUDGET.NORMAL + 1, `seed ${seed}: ${maxSeen} đòn cùng lúc`);
  }
});

test('TẮT: không có giới hạn (hành vi cũ) — kiểm chứng ngân sách thật sự có tác dụng khi BẬT', () => {
  const r = newRun(2, false), p = player(r);
  r.time = 240; r.dir.mini = 'DEAD'; let maxSeen = 0;   // (23/11) không cho boss ra: trận boss giờ dọn sân + ngừng sinh quái
  play(r, p, 90, (r, p) => {
    let n = 0;
    for (const m of r.scene.monsters) if (!m.dead && !m.boss && (m.st === 'windup' || m.st === 'dash') && inCameraView(r.scene.map, p, m.x, m.y, 0)) n++;
    maxSeen = Math.max(maxSeen, n);
  });
  assert.ok(maxSeen > TACTICS.BUDGET.NORMAL + 1, 'AI cũ có lúc nhiều đòn cùng lúc hơn ngân sách: ' + maxSeen);
});
