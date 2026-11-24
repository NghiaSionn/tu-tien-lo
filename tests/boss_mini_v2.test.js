// M10-09: Lang Vương 2 pha / 5 chiêu (run.bossV2)
import test, { before, after } from 'node:test';
import { BOSS_SKILLS } from '../src/systems/tactics.js';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { BOSS, BOSS_V2, TACTICS, PLAYER, FEATURES } from '../src/core/config.js';

const DT = 1 / 30, V = BOSS_V2.MINI;
// (24/11) đợt 2 thêm chiêu pha 2 mới (p2: true) — file này kiểm bộ chiêu M10 cũ nên gỡ tạm chúng khỏi bộ chọn
// (mỗi file test chạy tiến trình riêng). Chiêu đợt 2 kiểm trong tests/boss_p2_dot2.test.js.
const SAVED_V2 = {};
before(() => { for (const k of ['MINI_V2', 'FINAL_V2']) { SAVED_V2[k] = BOSS_SKILLS[k]; BOSS_SKILLS[k] = BOSS_SKILLS[k].filter(s => !s.p2); } });
after(() => { Object.assign(BOSS_SKILLS, SAVED_V2); });


function spotOK(map, x, y) {
  for (let a = 0; a < 16; a++) for (const r of [0, 40, 80, 120]) {
    const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
    if (!map.monStand(px, py) || !map.canStand(px, py)) return false;
  }
  return true;
}
// Trận Lang Vương: người chơi bất tử (inv) để đo AI; move(r,p,boss,i) điều khiển người chơi; hpAt(t) = tỉ lệ máu boss theo thời gian
function fight(seed, { on = true, diff = 1, sec = 60, move, hpAt, each, vuln = false } = {}) {
  let r, s;
  for (let k = 0; k < 40 && !s; k++) {
    r = createRun({ seed: seed * 100 + k, startSkill: 'sword_qi', realmLevel: 0, difficulty: diff });
    const map = r.scene.map;
    for (let j = 0; j < 600 && !s; j++) { const x = map.cx + ((j * 37) % 500) - 250, y = map.cy + ((j * 53) % 400) - 200; if (spotOK(map, x, y)) s = { x, y }; }
  }
  r.bossV2 = on; r.tactics = on; r.scene.monsters.length = 0; r.time = BOSS.MINI.AT; r.dir.mini = 'ALIVE';
  const p = { x: s.x, y: s.y, inv: 1, dead: false, fx: 1, fy: 0 };
  const boss = makeBoss(r, 'MINI', p.x + 110, p.y, 1); boss.remix = diff >= BOSS.REMIX_MIN_DIFF;
  const ev = [], seq = [];
  for (let i = 0; i < sec / DT && r.status === 'RUNNING' && !boss.dead; i++) {
    if (hpAt) boss.hp = Math.max(1, Math.round(boss.max * hpAt(i * DT)));
    if (move) move(r, p, boss, i); else { const a = i / 70; p.x = s.x + Math.cos(a) * 60; p.y = s.y + Math.sin(a) * 40; }
    p.inv = vuln ? Math.max(0, p.inv - DT) : 1;   // vuln: người chơi nhận đòn thật (bất tử ngắn sau mỗi đòn như game)
    const st = boss.st, before = r.scene.hazards.length;
    const e = []; updateRun(r, p, DT, e); ev.push(...e.map(x => ({ ...x, t: i * DT })));
    r.hp = r.maxHp; r.pendingDrafts = 0;
    if (st === 'move' && boss.st === 'windup') seq.push({ pat: boss.pat, t: i * DT, hp: boss.hp / boss.max });
    if (each) each(r, p, boss, i, st, before);
  }
  return { r, p, boss, ev, seq, s };
}

test('cờ mặc định BẬT (24/11); TẮT: Lang Vương không có Liệt Trảo / Vồ (24/11: vẫn biến hình pha 2 — chỉ hình ảnh/aura, không đổi chiêu)', () => {
  assert.equal(FEATURES.bossPatternsV2, true);   // (24/11) người phát triển bật mặc định
  const f = fight(1, { on: false, hpAt: t => Math.max(0.2, 1 - t / 40) });
  assert.ok(!f.seq.some(s => s.pat === 'claw' || s.pat === 'leap'), f.seq.map(s => s.pat).join(','));
  assert.equal(f.boss.p2, true, 'biến hình pha 2 khi tụt dưới BOSS_P2.MINI.AT');
});

test('BẬT: chuyển P1 -> P2 đúng 1 lần ở ngưỡng 55 %; P1 không có Vồ / Hú Rồi Lao; P2 có Vồ', () => {
  for (const seed of [1, 2, 3]) {
    const f = fight(seed, { hpAt: t => Math.max(0.2, 1 - t / 50), sec: 70, move: wander });
    const ann = f.ev.filter(e => e.type === 'announce' && e.text === V.P2_TEXT);
    assert.equal(ann.length, 1, `seed ${seed}: ${ann.length} lần chuyển pha`);
    for (const s of f.seq) if (s.hp > V.PHASE2) assert.ok(s.pat !== 'leap' && s.pat !== 'howlDash', `seed ${seed}: ${s.pat} ở P1 (máu ${(s.hp * 100).toFixed(0)}%)`);
    assert.ok(f.seq.some(s => s.pat === 'leap'), `seed ${seed}: P2 chưa Vồ: ${f.seq.map(s => s.pat).join(',')}`);
  }
});

test('BẬT (độ khó Linh): đủ 5 kiểu hành vi trong một trận; không chiêu nào lặp 3 lần liên tiếp', () => {
  const used = new Set();
  for (const seed of [4, 5, 6]) {
    const f = fight(seed, { hpAt: t => (t < 20 ? 1 : 0.4), sec: 90, move: wander });
    for (const s of f.seq) used.add(s.pat);
    const pats = f.seq.map(s => s.pat);
    for (let i = 2; i < pats.length; i++) assert.ok(!(pats[i] === pats[i - 1] && pats[i] === pats[i - 2]), pats.join(','));
  }
  for (const k of ['dash', 'howl', 'claw', 'howlDash', 'leap']) assert.ok(used.has(k), 'thiếu ' + k + ': ' + [...used].join(','));
});
// người chơi đi vòng, lúc sát lúc xa boss (30–110 px quanh điểm xuất phát) để boss có lý do dùng mọi chiêu
const wander = (r, p, b, i) => { const a = i / 50, R = 30 + 110 * (0.5 + 0.5 * Math.sin(i / 90)); p.x = f0(r).x + Math.cos(a) * R; p.y = f0(r).y + Math.sin(a) * R * 0.7; };
const _c = new WeakMap(); function f0(r) { if (!_c.has(r)) _c.set(r, { x: r.scene.monsters[0] ? r.scene.monsters[0].x - 110 : r.scene.map.cx, y: r.scene.monsters[0] ? r.scene.monsters[0].y : r.scene.map.cy }); return _c.get(r); }

test('Liệt Trảo: hướng khóa; trúng sau gồng khi đứng trước mặt; lùi ra sau tầm thì né được; sau chiêu có sơ hở', () => {
  for (const dodge of [false, true]) {
    let windAt = -1, lock = null, hits = [], recovered = false;
    const f = fight(7, {
      sec: 40, hpAt: () => 1, vuln: true,
      move: (r, p, b) => {
        if (b.pat === 'claw' && b.st === 'windup' && dodge) { p.x -= b.dirX * PLAYER.SPEED * DT; p.y -= b.dirY * PLAYER.SPEED * DT; }
        else if (b.st !== 'windup' || b.pat !== 'claw') { p.x = b.x - 50; p.y = b.y; }   // đứng sát để boss chọn Liệt Trảo
      },
      each: (r, p, b, i, st) => {
        if (st === 'move' && b.st === 'windup' && b.pat === 'claw' && windAt < 0) { windAt = i * DT; lock = [b.dirX, b.dirY]; r.dmgBy = {}; }
        if (windAt >= 0 && b.pat === 'claw' && b.st === 'windup') assert.deepEqual([b.dirX, b.dirY], lock);
        if (windAt >= 0 && !recovered && b.st === 'recover') recovered = b.vuln > 0;
      },
    });
    assert.ok(windAt >= 0, 'đã dùng Liệt Trảo'); assert.ok(recovered, 'có sơ hở sau chiêu');
    const got = f.r.dmgBy['miniboss:claw'] || 0;
    if (dodge) assert.equal(got, 0, 'lùi rồi vẫn trúng'); else assert.ok(got > 0, 'đứng trước mặt phải trúng');
  }
});

test('Vồ Đầu Đàn: dấu đáp dự đoán (≤ MAX_LEAD so với người chơi), đứng được; boss đáp đúng dấu; sát thương chỉ lúc đáp; rời vòng thì né', () => {
  let tested = 0;
  for (const seed of [8, 9, 10]) {
    for (const dodge of [false, true]) {
      let mark = null, markAt = -1, landed = -1, firstHit = -1;
      const f = fight(seed, {
        sec: 60, hpAt: () => 0.4, vuln: true,
        move: (r, p, b, i) => {
          if (mark && landed < 0 && !dodge) { p.x = mark.x; p.y = mark.y; }   // đứng ngay trong dấu đáp
          else if (mark && landed < 0 && dodge) { const dx = p.x - mark.x, dy = p.y - mark.y, l = Math.hypot(dx, dy) || 1; p.x += dx / l * PLAYER.SPEED * DT; p.y += dy / l * PLAYER.SPEED * DT; }
          else if (!mark) { const o = f0(r); p.x = o.x; p.y = o.y + Math.sin(i / 20) * 20; if (b.st === 'move') { b.x = o.x + 140; b.y = o.y; } }   // người chơi trong khoảng trống, boss giữ tầm vồ; có chuyển động để dự đoán
        },
        each: (r, p, b, i) => {
          for (const m of r.scene.monsters) if (!m.boss) m.dead = true;   // chỉ đo đòn Vồ (sói đàn cắn cho bất tử ngắn làm nhiễu)
          const h = r.scene.hazards.find(z => z.src === 'miniboss:leap');
          if (h && !mark) { mark = { x: h.x, y: h.y }; markAt = i * DT; assert.ok(Math.hypot(h.x - p.x, h.y - p.y) <= V.LEAP.MAX_LEAD + 1, 'dự đoán quá xa'); assert.ok(r.scene.map.monStand(h.x, h.y)); r.dmgBy = {}; }
          if (mark && landed < 0 && (b.st === 'recover' || b.st === 'tkGap')) { landed = i * DT; assert.ok(Math.hypot(b.x - mark.x, b.y - mark.y) < 1, 'boss không đáp đúng dấu'); }
          if (mark && firstHit < 0 && r.dmgBy['miniboss:leap'] && (landed < 0 || i * DT <= landed + 0.2)) firstHit = i * DT;   // chỉ cú vồ đầu tiên
        },
      });
      if (!mark) continue;
      tested++;
      assert.ok(landed > 0, `seed ${seed}: chưa đáp`);
      if (dodge) assert.ok(firstHit < 0, `seed ${seed}: rời vòng vẫn trúng`);
      else { assert.ok(firstHit > 0, `seed ${seed}: đứng trong dấu đáp phải trúng`); assert.ok(firstHit >= markAt + V.LEAP.WINDUP + V.LEAP.AIR - DT * 2, 'trúng trước lúc đáp'); }
    }
  }
  assert.ok(tested >= 4, 'đã thử ' + tested);
});

test('giới hạn triệu hồi: sói đàn do Lang Vương gọi không vượt MAX_SUMMONED; không kẹt (luôn tới gần người chơi được)', () => {
  for (const seed of [11, 12]) {
    let peak = 0, far = 0;
    fight(seed, { sec: 80, hpAt: t => (t < 30 ? 1 : 0.4), each: (r, p, b) => {
      peak = Math.max(peak, r.scene.monsters.filter(m => m.summoned && !m.dead).length);
      if (Math.hypot(b.x - p.x, b.y - p.y) > 400) far++;
    } });
    assert.ok(peak <= TACTICS.MAX_SUMMONED, `seed ${seed}: ${peak} sói đàn`);
    assert.ok(far < 30 * 3, `seed ${seed}: boss xa người chơi ${far} khung`);
  }
});

test('BẬT: tất định — cùng seed cùng chuỗi chiêu', () => {
  const pats = () => fight(13, { hpAt: t => Math.max(0.3, 1 - t / 40), sec: 50 }).seq.map(s => s.pat + '@' + s.t.toFixed(2)).join(',');
  assert.equal(pats(), pats());
});
