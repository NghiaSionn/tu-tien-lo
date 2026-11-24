// M10-10: Ma Ảnh Yêu Vương 2 pha / 7 chiêu (run.bossV2)
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { hasEscape, hazardDist, BOSS_SKILLS } from '../src/systems/tactics.js';
import { BOSS, BOSS_V2, PLAYER, SKILL_NAMES } from '../src/core/config.js';

const DT = 1 / 30, V = BOSS_V2.FINAL, P2 = V.PHASE2 ?? BOSS.FINAL.PHASE2;
// (24/11) đợt 2 thêm chiêu pha 2 mới (p2: true) — file này kiểm bộ chiêu M10 cũ nên gỡ tạm chúng khỏi bộ chọn
// (mỗi file test chạy tiến trình riêng). Chiêu đợt 2 kiểm trong tests/boss_p2_dot2.test.js.
const SAVED_V2 = {};
before(() => { for (const k of ['MINI_V2', 'FINAL_V2']) { SAVED_V2[k] = BOSS_SKILLS[k]; BOSS_SKILLS[k] = BOSS_SKILLS[k].filter(s => !s.p2); } });
after(() => { Object.assign(BOSS_SKILLS, SAVED_V2); });


function spotOK(map, x, y) {
  for (let a = 0; a < 16; a++) for (const r of [0, 50, 100, 150]) {
    const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
    if (!map.monStand(px, py) || !map.canStand(px, py)) return false;
  }
  return true;
}
function arena(seed, diff) {
  for (let k = 0; k < 60; k++) {
    const r = createRun({ seed: seed * 100 + k, startSkill: 'sword_qi', realmLevel: 0, difficulty: diff }), map = r.scene.map;
    for (let j = 0; j < 600; j++) { const x = map.cx + ((j * 37) % 500) - 250, y = map.cy + ((j * 53) % 400) - 200; if (spotOK(map, x, y)) return [r, { x, y }]; }
  }
  throw new Error('không có khoảng trống');
}
// Trận Yêu Vương. move(r,p,boss,i,o) điều khiển người chơi (o = điểm trống); hpAt(t) tỉ lệ máu boss; vuln: người chơi nhận đòn thật
function fight(seed, { on = true, diff = 1, sec = 60, move, hpAt, each, vuln = false, clearMobs = true } = {}) {
  const [r, o] = arena(seed, diff);
  r.bossV2 = on; r.tactics = on; r.scene.monsters.length = 0; r.time = BOSS.FINAL.AT; r.dir.final = 'ALIVE'; r.dir.mini = 'DEAD';
  const p = { x: o.x, y: o.y, inv: 1, dead: false, fx: 1, fy: 0 };
  const boss = makeBoss(r, 'FINAL', o.x + 120, o.y, 1); boss.remix = diff >= BOSS.REMIX_MIN_DIFF;
  const ev = [], seq = [];
  for (let i = 0; i < sec / DT && r.status === 'RUNNING' && !boss.dead; i++) {
    if (hpAt) boss.hp = Math.max(1, Math.round(boss.max * hpAt(i * DT)));
    if (clearMobs) for (const m of r.scene.monsters) if (!m.boss) m.dead = true;
    if (move) move(r, p, boss, i, o); else { const a = i / 60, R = 40 + 90 * (0.5 + 0.5 * Math.sin(i / 80)); p.x = o.x + Math.cos(a) * R * 0.8; p.y = o.y + Math.sin(a) * R * 0.6; }
    p.inv = vuln ? Math.max(0, p.inv - DT) : 1;
    const st = boss.st, nh = r.scene.hazards.length;
    const e = []; updateRun(r, p, DT, e); ev.push(...e.map(x => ({ ...x, t: i * DT })));
    r.hp = r.maxHp; r.pendingDrafts = 0;
    if (st === 'move' && (boss.st === 'windup' || boss.st === 'blink')) seq.push({ pat: boss.pat, t: i * DT, hp: boss.hp / boss.max, age: boss.age });
    if (each) each(r, p, boss, i, st, nh);
  }
  return { r, p, boss, ev, seq, o };
}
const wanderFar = (r, p, b, i, o) => { const a = i / 60, R = 30 + 150 * (0.5 + 0.5 * Math.sin(i / 70)); p.x = o.x + Math.cos(a) * R * 0.8; p.y = o.y + Math.sin(a) * R * 0.6; };

test('TẮT: Yêu Vương không có Ảnh Độn / Hoành Tảo / Thập Tự, không thông báo chuyển pha mới', () => {
  const f = fight(1, { on: false, hpAt: t => Math.max(0.2, 1 - t / 40) });
  assert.ok(!f.seq.some(s => ['shadow', 'sweep', 'cross'].includes(s.pat)), f.seq.map(s => s.pat).join(','));
  assert.ok(!f.ev.some(e => e.text === V.P2_TEXT));
});

test('BẬT: đúng 1 lần chuyển P1 -> P2 ở ngưỡng config (không pha 3, kể cả khi cuồng nộ); chiêu mới chỉ ở P2; Lao Tù P1 chỉ sau làm quen', () => {
  for (const seed of [1, 2, 3]) {
    // chạy quá ENRAGE_AFTER để chắc cuồng nộ không tạo pha 3
    const f = fight(seed, { sec: BOSS.FINAL.ENRAGE_AFTER + 20, hpAt: t => Math.max(0.15, 1 - t / 60), move: wanderFar });
    assert.equal(f.ev.filter(e => e.text === V.P2_TEXT).length, 1, `seed ${seed}: số lần chuyển pha`);
    assert.ok(f.boss.enraged, 'đã cuồng nộ');
    for (const s of f.seq) {
      if (s.hp > P2) assert.ok(!['shadow', 'sweep', 'cross'].includes(s.pat), `seed ${seed}: ${s.pat} ở P1 (${(s.hp * 100).toFixed(0)}%)`);
      if (s.hp > P2 && s.pat === 'prison') assert.ok(s.age >= V.PRISON_AFTER, 'Lao Tù trước khi làm quen');
    }
  }
});

test('BẬT (Linh): đủ 7 chiêu; không chiêu nào 3 lần liên tiếp; mọi nguồn sát thương có tên', () => {
  const used = new Set();
  for (const seed of [4, 5, 6, 7]) {
    const f = fight(seed, { sec: 120, hpAt: t => (t < 40 ? 1 : 0.35), move: wanderFar, vuln: true });
    for (const s of f.seq) used.add(s.pat);
    const pats = f.seq.map(s => s.pat);
    for (let i = 2; i < pats.length; i++) assert.ok(!(pats[i] === pats[i - 1] && pats[i] === pats[i - 2]), pats.join(','));
    for (const k of Object.keys(f.r.dmgBy)) assert.ok(SKILL_NAMES[k], 'chưa có tên: ' + k);
  }
  for (const k of ['burst', 'zones', 'slam', 'prison', 'shadow', 'sweep', 'cross']) assert.ok(used.has(k), 'thiếu ' + k + ': ' + [...used].join(','));
});

test('Thập Tự Hắc Liệt: 2 dải vuông góc giao tại vị trí người chơi; không cùng lúc với Lao Tù; đứng giữa thì trúng sau gồng, bước chéo thì né', () => {
  for (const dodge of [false, true]) {
    let marked = null, at = -1, got = 0, coexist = 0;
    fight(8, {
      sec: 90, hpAt: () => 0.35, vuln: true,
      move: (r, p, b, i, o) => {
        if (marked && dodge) { p.x = marked.x + marked.bx * 30; p.y = marked.y + marked.by * 30; }   // bước theo đường phân giác giữa 2 dải (góc an toàn)
        else if (marked) { p.x = marked.x; p.y = marked.y; }
        else { p.x = o.x + Math.sin(i / 30) * 15; p.y = o.y; if (b.st === 'move') { b.x = o.x + 110; b.y = o.y; } }
      },
      each: (r, p, b, i) => {
        const cr = r.scene.hazards.filter(h => h.src === 'boss:cross');
        if (cr.length && r.scene.hazards.some(h => h.src === 'boss:prison')) coexist++;
        if (cr.length === 2 && !marked) {
          const u = [cr[0].x1 - cr[0].x0, cr[0].y1 - cr[0].y0], v = [cr[1].x1 - cr[1].x0, cr[1].y1 - cr[1].y0];
          const lu = Math.hypot(...u), lv = Math.hypot(...v), bx = u[0] / lu + v[0] / lv, by = u[1] / lu + v[1] / lv, lb = Math.hypot(bx, by);
          marked = { x: cr[0].x, y: cr[0].y, bx: bx / lb, by: by / lb }; at = i * DT; r.dmgBy = {};
          assert.ok(Math.abs(u[0] * v[0] + u[1] * v[1]) < 1e-6, 'không vuông góc');
          for (const h of cr) assert.ok(hazardDist(h, p.x, p.y) < 1, 'dải không đi qua vị trí người chơi');
        }
        if (marked && !got && r.dmgBy['boss:cross'] && i * DT <= at + V.CROSS.WINDUP + 0.2) { got = i * DT; }   // chỉ lần Thập Tự đầu
      },
    });
    assert.ok(marked, 'đã ra Thập Tự'); assert.equal(coexist, 0, 'Thập Tự chồng Lao Tù');
    if (dodge) assert.equal(got, 0, 'bước chéo vẫn trúng');
    else { assert.ok(got > 0, 'đứng giữa phải trúng'); assert.ok(got >= at + V.CROSS.WINDUP - DT * 2, 'trúng trước khi hết gồng'); }
  }
});

test('Ma Quang Hoành Tảo: tia bắt đầu lệch khỏi người chơi; trúng sau gồng; ra khỏi tầm hoặc đứng ở nửa không bị quét thì né', () => {
  for (const mode of ['stay', 'out', 'behind']) {
    let start = -1, hitT = 0, info = null;
    fight(9, {
      sec: 90, hpAt: () => 0.35, vuln: true,
      move: (r, p, b, i, o) => {
        if (info && mode === 'out') { const dx = p.x - b.x, dy = p.y - b.y, l = Math.hypot(dx, dy) || 1; p.x = b.x + dx / l * (V.SWEEP.L + 30); p.y = b.y + dy / l * (V.SWEEP.L + 30); }
        else if (info && mode === 'behind') { const a = info.a0 - info.dir * Math.PI / 2; p.x = b.x + Math.cos(a) * 60; p.y = b.y + Math.sin(a) * 60; }   // nửa vòng bên kia
        else if (!info) { p.x = o.x + Math.sin(i / 25) * 10; p.y = o.y; if (b.st === 'move') { b.x = o.x + 80; b.y = o.y; } }
      },
      each: (r, p, b, i, st) => {
        if (st === 'move' && b.st === 'windup' && b.pat === 'sweep' && !info) {
          info = { a0: b.swA0, dir: b.swDir }; start = i * DT; r.dmgBy = {};
          const ap = Math.atan2(p.y - b.y, p.x - b.x), off = Math.abs(Math.atan2(Math.sin(ap - b.swA0), Math.cos(ap - b.swA0)));
          assert.ok(off >= V.SWEEP.SAFE_START - 0.05, 'tia bắt đầu ngay trên người chơi');
        }
        if (info && !hitT && r.dmgBy['boss:sweep'] && i * DT <= start + V.SWEEP.WINDUP + V.SWEEP.TIME + 0.2) hitT = i * DT;   // chỉ lần quét đầu
      },
    });
    assert.ok(info, 'đã dùng Hoành Tảo');
    if (mode === 'stay') { assert.ok(hitT > 0, 'đứng yên phải trúng'); assert.ok(hitT >= start + V.SWEEP.WINDUP - DT * 2, 'trúng trước khi hết gồng'); }
    else assert.equal(hitT, 0, mode + ': vẫn trúng');
  }
});

test('Ảnh Độn: báo điểm hiện ra WARN giây (không dịch chuyển sớm); hiện ra ở ô đứng được trong vòng MIN_R..MAX_R; sau đó sơ hở, chưa cắn ngay', () => {
  let n = 0;
  for (const seed of [10, 11, 12, 17, 18, 19]) {
    let start = -1, from = null, landed = -1, dist = 0;
    const f = fight(seed, {
      sec: 90, hpAt: () => 0.35, vuln: true,
      move: (r, p, b, i, o) => { if (landed > 0) { p.x = b.x - 15; p.y = b.y; } else wanderFar(r, p, b, i, o); },
      each: (r, p, b, i, st) => {
        if (b.st === 'blink' && b.blinkSkill && start < 0) { start = i * DT; from = [b.x, b.y]; dist = Math.hypot(b.blinkX - p.x, b.blinkY - p.y); r.dmgBy = {}; }
        if (start >= 0 && landed < 0 && b.st === 'blink') assert.deepEqual([b.x, b.y], from, 'dịch chuyển sớm');
        if (start >= 0 && landed < 0 && st === 'blink' && b.st !== 'blink') { landed = i * DT; assert.equal(b.st, 'recover'); assert.ok(r.scene.map.canStand(b.x, b.y)); }
        if (landed > 0 && i * DT < landed + V.SHADOW.GRACE) assert.ok(!r.dmgBy['boss'], 'cắn ngay khi vừa hiện ra');
      },
    });
    if (start < 0) continue;
    n++;
    assert.ok(landed - start >= V.SHADOW.WARN - DT * 1.5);
    assert.ok(dist >= V.SHADOW.MIN_R - 1 && dist <= V.SHADOW.MAX_R + 1, 'khoảng cách hiện ra ' + dist);
    void f;
  }
  assert.ok(n >= 2, 'Ảnh Độn ' + n + ' seed');
});

test('mọi lần thả vùng (gồm Thập Tự, Lao Tù) người chơi còn lối thoát', () => {
  let placed = 0;
  for (const seed of [13, 14, 15]) {
    fight(seed, { sec: 100, hpAt: t => (t < 30 ? 1 : 0.35), move: wanderFar, each: (r, p, b, i, st, nh) => {
      if (r.scene.hazards.length > nh) { placed++; assert.ok(hasEscape(r.scene.map, p, r.scene.hazards, Math.min(...r.scene.hazards.map(h => h.t))), `seed ${seed}: bị bịt kín lúc ${r.time.toFixed(1)}`); }
    } });
  }
  assert.ok(placed >= 15, 'đã thả ' + placed);
});

test('boss chết: dọn sạch vùng/đạn tối, không gây sát thương sau đó, thưởng đúng 1 lần, kết thúc WIN', () => {
  const [r, o] = arena(16, 1);
  r.bossV2 = true; r.tactics = true; r.scene.monsters.length = 0; r.time = BOSS.FINAL.AT; r.dir.final = 'ALIVE'; r.dir.mini = 'DEAD';
  const p = { x: o.x, y: o.y, inv: 0, dead: false };
  const b = makeBoss(r, 'FINAL', o.x + 90, o.y, 1); b.remix = true; b.hp = Math.round(b.max * 0.3);
  let killedAt = -1;
  for (let i = 0; i < 30 * 40 && r.status === 'RUNNING'; i++) {
    if (killedAt < 0 && r.scene.hazards.length >= 2) { b.hp = 0; b.dead = true; killedAt = i; }
    p.inv = 0; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
  }
  assert.ok(killedAt >= 0, 'boss đã thả vùng trước khi chết');
  assert.equal(r.outcome, 'WIN'); assert.equal(r.scene.hazards.length, 0);
  assert.equal(r.scene.enemyShots.filter(s => s.kind === 'dark').length, 0);
  assert.equal(r.rewards.filter(x => x.kind === 'FINAL').length, 1);
});
