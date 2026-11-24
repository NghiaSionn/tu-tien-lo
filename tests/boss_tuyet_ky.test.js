// (24/11) Tuyệt Kỹ (đợt 1, mốc 70 %): chuỗi chiêu liên hoàn cố định. Bản đầu KHÔNG khiên (BOSS_TK.SHIELD = false, người
// phát triển 24/11): vẫn nhận sát thương, hết chuỗi là sơ hở thường. Bật SHIELD: khiên chặn sát thương, vỡ thì choáng. Mỗi mốc chỉ 1 lần; tắt bộ chiêu V2 thì không có; mỗi chiêu trong chuỗi lúc bắt đầu gồng
// luôn còn chỗ an toàn chạy tới kịp (đi bộ PLAYER.SPEED trong thời gian gồng).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { damageMonster } from '../src/entities/monsters.js';
import { dangerShapes } from '../src/systems/tactics.js';
import { BOSS, BOSS_TK, PLAYER } from '../src/core/config.js';

const DT = 1 / 30;
function fight(kind, seed, { bossV2 = true, move } = {}) {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 3 }); r.bossV2 = bossV2;
  r.time = BOSS[kind].AT - 0.5; if (kind === 'FINAL') r.dir.mini = 'DEAD';
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 0, dead: false, fx: 1, fy: 0 };
  let b = null;
  const step = (n = 1, ev = []) => {
    for (let i = 0; i < n && r.status === 'RUNNING'; i++) {
      if (move) move(p, r, b, i);
      updateRun(r, p, DT, ev); r.hp = r.maxHp; r.pendingDrafts = 0;
      b = b || r.scene.monsters.find(m => m.boss && !m.dead);
    }
    return ev;
  };
  step(40);
  return { r, p, step, boss: () => b };
}
// theo dõi chuỗi: ghi các chiêu boss gồng khi đang có Tuyệt Kỹ, tới khi khiên vỡ
function runTk(kind, seed, opts) {
  const f = fight(kind, seed, opts), b = f.boss();
  b.hp = Math.round(b.max * 0.69);
  const seq = [], ev = []; let on = -1, off = -1, minHp = b.hp, prev = '';
  for (let i = 0; i < 30 * 20; i++) {
    f.step(1, ev);
    if (b.st === 'tkOn' && on < 0) on = i;
    if (b.tk) { minHp = Math.min(minHp, b.hp); const k = b.st + ':' + b.pat; if (b.st === 'windup' && k !== prev) seq.push(b.pat); prev = k; }
    if (on >= 0 && !b.tk && off < 0) { off = i; break; }
  }
  return { ...f, b, seq, on, off, minHp, ev };
}

test('Tuyệt Kỹ 70 %: Lang Vương lao ×2 -> Liệt Trảo -> Vồ, không khiên, hết chuỗi sơ hở thường', () => {
  for (const seed of [1, 2, 3]) {
    const t = runTk('MINI', seed);
    assert.ok(t.on >= 0 && t.off > t.on, 'bật rồi vỡ khiên');
    const pats = t.seq.filter((p, i) => p !== t.seq[i - 1]);   // lao ×2 gồng 2 lần cùng tên
    assert.deepEqual(pats.slice(0, 2), ['dash', 'claw'], t.seq.join(','));
    assert.ok(['leap', 'dash'].includes(pats[2]), 'Vồ (không đặt được dấu thì lao)');
    assert.ok(!t.b.shield && t.b.vuln > 0 && t.b.vuln <= BOSS.MINI.RECOVER && t.b.st === 'recover', 'không khiên; hết chuỗi sơ hở thường');
    const dur = (t.off - t.on) * DT;
    assert.ok(dur > 5.5 && dur < 10, 'chuỗi 5,5–10 s: ' + dur.toFixed(2));
    assert.ok(t.ev.some(e => e.type === 'tkStart') && !t.ev.some(e => e.type === 'tkBreak'));
  }
});

test('Tuyệt Kỹ 70 %: Yêu Vương Thập Tự -> Hắc Diễm -> đạn tỏa', () => {
  for (const seed of [1, 2, 3]) {
    const t = runTk('FINAL', seed);
    assert.ok(t.on >= 0 && t.off > t.on);
    assert.ok(['cross', 'burst'].includes(t.seq[0]), t.seq.join(','));   // Thập Tự không chừa lối né -> đổi sang đạn tỏa
    assert.deepEqual(t.seq.slice(1), ['zones', 'burst']);
    assert.ok(!t.b.shield && t.b.st === 'recover');
  }
});

test('khiên (khi bật SHIELD) chặn sát thương, báo "MIỄN" thưa; mỗi mốc chỉ 1 lần', () => {
  const t = runTk('MINI', 4);
  const b = t.b;
  b.tk = { seq: [], i: 0 }; b.shield = 1e9;
  const hp = b.hp, ev = [];
  assert.equal(damageMonster(b, 999, ev), false); assert.equal(b.hp, hp);
  damageMonster(b, 999, ev);
  assert.equal(ev.filter(e => e.text === 'MIỄN').length, 1, 'báo thưa');
  b.tk = null; b.shield = 0;
  b.hp = Math.round(b.max * 0.65); t.step(60);
  assert.ok(!b.tk, 'mốc 70 % đã dùng thì không bật lại');
});

test('tắt bộ chiêu V2: không có Tuyệt Kỹ', () => {
  const f = fight('MINI', 1, { bossV2: false }), b = f.boss();
  b.hp = Math.round(b.max * 0.6); f.step(30 * 6);
  assert.ok(!b.tkDone || !Object.keys(b.tkDone).length); assert.ok(!b.tk);
});

test('mỗi chiêu trong chuỗi: lúc bắt đầu gồng luôn còn chỗ an toàn chạy tới kịp', () => {
  const hit = (s, x, y) => s.r !== undefined ? Math.hypot(x - s.x, y - s.y) < s.r
    : (() => { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, l2 = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((x - s.x0) * vx + (y - s.y0) * vy) / l2)); return Math.hypot(x - s.x0 - vx * k, y - s.y0 - vy * k) < s.w; })();
  for (const kind of ['MINI', 'FINAL']) for (const seed of [1, 2, 3, 4]) {
    const f = fight(kind, seed, { move: (p, r, b, i) => { if (b) { const a = r.time * 0.9; p.x = r.scene.map.cx + Math.cos(a) * 60; p.y = r.scene.map.cy + Math.sin(a) * 40; } } });
    const b = f.boss(); b.hp = Math.round(b.max * 0.69);
    let prev = '', checked = 0;
    for (let i = 0; i < 30 * 14; i++) {
      f.step(1);
      const k = b.st + ':' + b.pat + ':' + (b.tk ? b.tk.i : -1);
      if (b.tk && b.st === 'windup' && k !== prev) {
        const ds = dangerShapes(f.r.scene, f.p), reach = PLAYER.SPEED * b.stT * 0.8;
        let ok = !ds.some(s => hit(s, f.p.x, f.p.y));
        for (let j = 0; j < 32 && !ok; j++) for (const fr of [0.33, 0.66, 1]) {
          const a = j / 32 * Math.PI * 2, x = f.p.x + Math.cos(a) * reach * fr, y = f.p.y + Math.sin(a) * reach * fr;
          if (f.r.scene.map.canStand(x, y) && !ds.some(s => hit(s, x, y))) { ok = true; break; }
        }
        assert.ok(ok, `${kind} seed ${seed}: ${b.pat} không còn chỗ an toàn trong tầm ${reach.toFixed(0)} px`);
        checked++;
      }
      prev = k;
      if (!b.tk && i > 60) break;
    }
    assert.ok(checked >= 3, kind + ' kiểm được các chiêu trong chuỗi');
  }
});

test('bật BOSS_TK.SHIELD: khiên giữ máu suốt chuỗi, vỡ thì choáng STUN', () => {
  BOSS_TK.SHIELD = true;
  try {
    const t = runTk('MINI', 1);
    assert.equal(t.minHp, Math.round(t.b.max * 0.69), 'không mất máu khi có khiên');
    assert.ok(t.b.vuln >= BOSS_TK.MINI.STUN - 0.1 && t.b.shield === 0, 'choáng sau khi vỡ');
    assert.ok(t.ev.some(e => e.type === 'tkBreak'));
  } finally { BOSS_TK.SHIELD = false; }
});

// (24/11) đợt 3: mốc 40 % / 15 % chỉ ở pha 2, chuỗi dùng chiêu pha 2; mỗi chiêu trong chuỗi còn chỗ an toàn chạy kịp
const P2_SEQ = { MINI: { 0.4: ['dash', 'claw', 'leap', 'leap'], 0.15: ['dash', 'cracks', 'leap', 'quake', 'rageHowl'] },
  FINAL: { 0.4: ['thunder', 'runes', 'chainBolt', 'sweep'], 0.15: ['net', 'runes', 'thunder', 'burst', 'sweep'] } };
function runTkP2(kind, seed, at, done, move) {
  const f = fight(kind, seed, { move }), b = f.boss();
  b.p2 = true; b.tkDone = { ...done }; b.hp = Math.round(b.max * at);
  const seq = [], checks = []; let prev = '', on = -1, off = -1;
  const hitS = (s, x, y) => s.ring ? false : s.r !== undefined ? Math.hypot(x - s.x, y - s.y) < s.r
    : (() => { const vx = s.x1 - s.x0, vy = s.y1 - s.y0, l2 = vx * vx + vy * vy || 1, k = Math.max(0, Math.min(1, ((x - s.x0) * vx + (y - s.y0) * vy) / l2)); return Math.hypot(x - s.x0 - vx * k, y - s.y0 - vy * k) < s.w; })();
  for (let i = 0; i < 30 * 20; i++) {
    f.step(1);
    if (b.st === 'tkOn' && on < 0) on = i;
    const k = b.st + ':' + b.pat + ':' + (b.tk ? b.tk.i : '');
    if (on >= 0 && b.tk && b.st === 'windup' && k !== prev) {
      seq.push(b.pat);
      const ds = dangerShapes(f.r.scene, f.p), tMin = Math.min(b.stT, ...f.r.scene.hazards.map(h => h.t)), reach = PLAYER.SPEED * tMin * 0.8;
      const bad = (x, y) => ds.some(s => s.ring ? Math.abs(Math.hypot(x - s.x, y - s.y) - s.R) < s.w && (s.span >= 6.28 || ((Math.atan2(y - s.y, x - s.x) - s.a0) % 6.2832 + 6.2832) % 6.2832 <= s.span) : hitS(s, x, y));
      let ok = !bad(f.p.x, f.p.y);
      for (let j = 0; j < 32 && !ok; j++) for (const fr of [0.25, 0.5, 0.75, 1]) { const a = j / 32 * Math.PI * 2, x = f.p.x + Math.cos(a) * reach * fr, y = f.p.y + Math.sin(a) * reach * fr; if (f.r.scene.map.canStand(x, y) && !bad(x, y)) { ok = true; break; } }
      checks.push({ pat: b.pat, ok, reach: Math.round(reach) });
    }
    prev = k;
    if (on >= 0 && !b.tk) { off = i; break; }
  }
  return { b, seq, checks, on, off };
}
test('Tuyệt Kỹ mốc 40 % / 15 % (pha 2): đúng chuỗi chiêu pha 2, mỗi chiêu còn chỗ an toàn chạy kịp', () => {
  const circle = (p, r, b) => { if (b) { const a = r.time * 0.9; p.x = r.scene.map.cx + Math.cos(a) * 70; p.y = r.scene.map.cy + Math.sin(a) * 45; } };
  for (const kind of ['MINI', 'FINAL']) for (const [at, done] of [[0.39, { 0.7: true }], [0.14, { 0.7: true, 0.4: true }]]) for (const seed of [1, 2, 3]) {
    const mk = at > 0.3 ? 0.4 : 0.15, t = runTkP2(kind, seed, at, done, circle);
    assert.ok(t.on >= 0 && t.off > t.on, `${kind} ${mk} seed ${seed}: bật rồi kết thúc`);
    const pats = t.seq.filter((p, i) => !(p === 'dash' && t.seq[i - 1] === 'dash'));   // Tam Xung gồng 3 lần cùng tên
    const want = P2_SEQ[kind][mk];
    assert.equal(pats.length, want.length, `${kind} ${mk}: ${t.seq.join(',')}`);
    for (let i = 0; i < want.length; i++) assert.ok(pats[i] === want[i] || (want[i] === 'leap' && pats[i] === 'dash'), `${kind} ${mk}: ${t.seq.join(',')}`);
    for (const c of t.checks) assert.ok(c.ok, `${kind} ${mk} seed ${seed}: ${c.pat} hết chỗ an toàn trong ${c.reach} px`);
    assert.ok(t.b.tkDone[mk], 'đánh dấu mốc đã dùng');
  }
});

test('mốc pha 2 không bật khi boss chưa sang pha 2; mốc pha 1 không bật khi đã ở pha 2', () => {
  const f = fight('MINI', 5), b = f.boss();
  b.p2 = false; b.tkDone = { 0.7: true }; b.hp = Math.round(b.max * 0.39);
  for (let i = 0; i < 20; i++) { f.step(1); b.p2 = false; if (b.st === 'phase') break; }
  assert.ok(!b.tk || b.st === 'phase', 'chưa pha 2 thì không có Tuyệt Kỹ 40 %');
  const g = fight('FINAL', 5), c = g.boss();
  c.p2 = true; c.tkDone = {}; c.hp = Math.round(c.max * 0.45); g.step(30);
  assert.ok(!c.tkDone[0.7], 'mốc 70 % (pha 1) không bật ở pha 2');
});
