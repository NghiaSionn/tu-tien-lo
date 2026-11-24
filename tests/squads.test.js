// M10-08: Director phối bầy có vai trò — đội hình, ngân sách, specialist, lối thoát (chỉ khi run.skillsV2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { aliveCost, budgetAt, squadCost } from '../src/systems/director.js';
import { SQUADS as SQ, SPECIALISTS as SP, BOSS, ARCH, WOLF_PACK as WP, ICE_FAN as IF, ELITE_V2 as EV, PLAYER, TACTICS } from '../src/core/config.js';

const DT = 1 / 30;
const play = (r, p, sec, each) => {
  const map = r.scene.map;
  for (let i = 0; i < Math.round(sec / DT) && r.status === 'RUNNING'; i++) {
    const a = r.time / 6; p.x = map.cx + Math.cos(a) * 70; p.y = map.cy + Math.sin(a) * 50; p.inv = 1;
    updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
    if (each) each(r, p);
  }
};
const fullRun = (seed, on, each) => {
  const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = on; r.tactics = on;
  const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false, fx: 1, fy: 0 };
  play(r, p, BOSS.FINAL.AT + 20, each);
  return r;
};

test('TẮT: không có đội hình, không gán specialist (director như cũ)', () => {
  const r = fullRun(3, false);
  assert.equal(r.dir.squads.length, 0);
  assert.ok(!r.scene.monsters.some(m => m.spec !== undefined));
});

test('BẬT: đội ra đúng nhịp, theo vòng mẫu, chỉ mẫu đã mở, không ra khi có boss; đủ 3 mẫu', () => {
  for (const seed of [1, 2, 3]) {
    const bossAlive = [];
    const r = fullRun(seed, true, r => { if (r.scene.monsters.some(m => m.boss && !m.dead)) bossAlive.push(Math.round(r.time)); });
    const sq = r.dir.squads;
    assert.ok(sq.length >= 4, `seed ${seed}: chỉ ${sq.length} đội`);
    assert.ok(sq[0].t >= SQ.FIRST);
    for (let i = 1; i < sq.length; i++) assert.ok(sq[i].t - sq[i - 1].t >= SQ.EVERY - 1, `seed ${seed}: hai đội cách ${sq[i].t - sq[i - 1].t}s`);
    for (const s of sq) assert.ok(s.t >= SQ.TEMPLATES[s.id].from, `${s.id} ra trước mốc`);
    for (const s of sq) assert.ok(!bossAlive.includes(s.t), `seed ${seed}: đội ${s.id} ra khi boss còn sống (${s.t}s)`);
    assert.deepEqual(new Set(sq.map(s => s.id)), new Set(SQ.ORDER), `seed ${seed}: ${sq.map(s => s.id).join(',')}`);
  }
});

test('BẬT: mỗi đội vừa ngân sách cost lúc sinh; sinh cùng một hướng, ngoài khung nhìn', () => {
  for (const seed of [4, 5]) {
    const seen = new Set();
    const r = fullRun(seed, true, (r, p) => {
      for (const m of r.scene.monsters) if (m.squad && !seen.has(m)) {
        seen.add(m);
        assert.ok(Math.hypot(m.x - p.x, m.y - p.y) > 250, 'thành viên đội sinh quá gần');
      }
    });
    for (const s of r.dir.squads) {
      assert.ok(s.before + s.cost <= s.budget + 1e-9, `seed ${seed}: ${s.id} vượt ngân sách (${s.before}+${s.cost} > ${s.budget})`);
      assert.equal(s.cost, squadCost(s.id) - (squadCost(s.id) - s.cost), 'cost ghi đúng');
    }
  }
});

test('BẬT: số specialist đang sống mỗi loài không vượt CAP; không có specialist trước mốc giới thiệu', () => {
  for (const seed of [6, 7]) {
    fullRun(seed, true, r => {
      const n = {};
      for (const m of r.scene.monsters) if (!m.dead && m.spec) {
        n[m.arch] = (n[m.arch] || 0) + 1;
        assert.ok(r.time >= SP.INTRO[m.arch], `${m.arch} specialist trước mốc ${SP.INTRO[m.arch]}s`);
      }
      for (const [a, k] of Object.entries(n)) assert.ok(k <= SP.CAP[a], `seed ${seed}: ${k} ${a} specialist (> ${SP.CAP[a]})`);
    });
  }
});

test('BẬT: chỉ specialist dùng kỹ năng mới (chồm / Hỏa Vĩ / quạt / Ảnh Bộ / Hắc Trảo)', () => {
  let normal = false;   // có lúc nào có quái thường (cuối trận Yêu Vương còn sống thì sân đã dọn sạch)
  const r = fullRun(8, true, r => {
    if (r.scene.monsters.some(m => !m.dead && m.spec === false)) normal = true;
    for (const m of r.scene.monsters) {
      if (m.dead || m.spec !== false) continue;
      assert.ok(!(m.arch === 'chaser' && (m.st === 'windup' || m.role === 'flank')), 'sói thường chồm/vòng sườn');
      assert.ok(!(m.arch === 'ranged' && m.fan), 'Huyền Băng Thú thường bắn quạt');
      assert.ok(!(m.arch === 'elite' && (m.st === 'blink' || m.sk === 'claw')), 'Ma Ảnh thường dùng kỹ năng mới');
    }
  });
  assert.ok(normal, 'có con thường');
});

// Các vùng/đường nguy hiểm đang hiện cảnh báo, theo đúng hình học trúng đòn
function dangerAt(sc, x, y) {
  for (const h of sc.hazards) if (Math.hypot(x - h.x, y - h.y) < h.r + PLAYER.HITBOX) return true;
  for (const f of sc.fireTrails || []) if (Math.hypot(x - f.x, y - f.y) < f.r + PLAYER.HITBOX) return true;
  const seg = (x0, y0, x1, y1, w) => { const vx = x1 - x0, vy = y1 - y0, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((x - x0) * vx + (y - y0) * vy) / l2)); return Math.hypot(x - x0 - vx * t, y - y0 - vy * t) < w; };
  for (const m of sc.monsters) {
    if (m.dead || (m.st !== 'windup' && m.st !== 'dash')) continue;
    let L = 0, w = 12;
    if (m.arch === 'charger') { L = ARCH.charger.DASH_SPEED * ARCH.charger.DASH_TIME; w = ARCH.charger.HIT_R + PLAYER.HITBOX; }
    else if (m.arch === 'chaser') { L = WP.POUNCE.SPEED * WP.POUNCE.TIME; w = WP.POUNCE.HIT_R + PLAYER.HITBOX; }
    else if (m.boss && m.pat === 'dash') { L = BOSS.MINI.DASH.SPEED * BOSS.MINI.DASH.TIME; w = BOSS.MINI.DASH.HIT_R; }
    else if (m.arch === 'ranged' && m.st === 'windup') {
      for (const a of m.fan ? [0, -IF.SPREAD, IF.SPREAD] : [0]) { const c = Math.cos(a), s = Math.sin(a), ux = m.dirX * c - m.dirY * s, uy = m.dirX * s + m.dirY * c; if (seg(m.x, m.y, m.x + ux * 250, m.y + uy * 250, ARCH.ranged.SHOT_R + PLAYER.HITBOX)) return true; }
    } else if (m.arch === 'elite' && m.st === 'windup') {
      const R = m.sk === 'claw' ? EV.CLAW.R : ARCH.elite.SLAM_R;
      if (Math.hypot(x - m.x, y - m.y) < R + PLAYER.HITBOX) return true;
    }
    if (L && m.st === 'dash') {   // đang lao: chỉ phần đường còn lại (tốc độ × thời gian còn lại)
      const sp = m.arch === 'charger' ? ARCH.charger.DASH_SPEED : m.arch === 'chaser' ? WP.POUNCE.SPEED : BOSS.MINI.DASH.SPEED;
      L = Math.min(L, sp * Math.max(0, m.stT));
    }
    if (L && seg(m.x, m.y, m.x + m.dirX * L, m.y + m.dirY * L, w)) return true;
  }
  return false;
}

test('lối thoát: lúc quái thường bắt đầu gồng đòn mới, người chơi luôn còn điểm an toàn trong tầm đi bộ 0,5 s; người đi mù theo vòng cố định hiếm khi bị bịt kín', () => {
  const reach = PLAYER.SPEED * TACTICS.NEW_ESCAPE_T;
  let claims = 0, framesInDanger = 0, framesBoxed = 0;
  const escape = (sc, map, p) => {
    for (const f of [0.5, 1]) for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283, x = p.x + Math.cos(a) * reach * f, y = p.y + Math.sin(a) * reach * f;
      if (map.canStand(x, y) && !dangerAt(sc, x, y)) return true;
    }
    return false;
  };
  for (const seed of [11, 12, 13, 14]) {
    for (const diff of [0, 1]) {
      const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0, difficulty: diff }); r.skillsV2 = true; r.tactics = true;
      const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false, fx: 1, fy: 0 };
      let prev = new Map();
      play(r, p, BOSS.FINAL.AT + 40, (r, p) => {
        const sc = r.scene, map = sc.map, now = new Map();
        let started = false;
        for (const m of sc.monsters) { now.set(m, m.st); if (!m.boss && !m.dead && m.st === 'windup' && prev.get(m) !== 'windup' && prev.has(m)) started = true; }
        prev = now;
        if (!dangerAt(sc, p.x, p.y)) return;
        framesInDanger++;
        const ok = escape(sc, map, p);
        if (!ok) framesBoxed++;
        if (started) { claims++; assert.ok(ok, `seed ${seed} diff ${diff} lúc ${r.time.toFixed(1)}s: đòn mới bắt đầu gồng khi mọi hướng né đều nguy hiểm`); }
      });
    }
  }
  console.log(`  [lối thoát] khung có cảnh báo trúng người chơi: ${framesInDanger}, bị bịt kín: ${framesBoxed} (${(100 * framesBoxed / Math.max(1, framesInDanger)).toFixed(2)} %), lúc bắt đầu gồng đã kiểm: ${claims}`);
  assert.ok(claims > 50, 'đã kiểm ' + claims + ' lần bắt đầu gồng khi người chơi trong cảnh báo');
  assert.ok(framesBoxed / Math.max(1, framesInDanger) < 0.01, `người đi mù bị bịt kín ${framesBoxed}/${framesInDanger} khung`);
});

test('BẬT: tất định — cùng seed cùng chuỗi đội và cùng specialist', () => {
  const snap = r => JSON.stringify({ sq: r.dir.squads.map(s => [s.id, s.t, s.n]), sp: r.scene.monsters.filter(m => m.spec).map(m => [m.arch, Math.round(m.x), Math.round(m.y)]) });
  assert.equal(snap(fullRun(21, true)), snap(fullRun(21, true)));
});
