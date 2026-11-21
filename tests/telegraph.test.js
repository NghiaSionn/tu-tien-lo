// M10-03: cảnh báo đòn và chống chồng đòn bất công.
// Không có sát thương trước khi hết cảnh báo; né được bằng đi bộ bình thường; hướng đã khóa không quay theo người chơi;
// vùng mới luôn chừa lối thoát; boss giải kẹt có báo trước; nguồn sát thương mang tên chiêu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy, makeBoss, inCameraView } from '../src/systems/director.js';
import { archetypeAI, updateEnemyShots } from '../src/entities/archetypes.js';
import { ARCH, BOSS, PLAYER, TACTICS, SKILL_NAMES } from '../src/core/config.js';
import { hasEscape, keepEscape, selectBossSkill, threatScan } from '../src/systems/tactics.js';

const DT = 1 / 30;
const newRun = (seed, tactics) => { const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.tactics = tactics; r.scene.monsters.length = 0; return r; };

// Tìm một khoảng trống quanh tâm đấu trường (không cây/đá/nước trên đường thử)
function openSpot(map) {
  for (let k = 0; k < 400; k++) {
    const x = map.cx + ((k * 37) % 300) - 150, y = map.cy + ((k * 53) % 200) - 100;
    let ok = true;
    for (let a = 0; a < 16 && ok; a++) for (const r of [0, 40, 80, 130]) {
      const px = x + Math.cos(a * 0.3927) * r, py = y + Math.sin(a * 0.3927) * r;
      if (!map.canStand(px, py) || map.blocksShot(px, py + 6)) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  throw new Error('không có khoảng trống');
}

// Một trận tay đôi: quái `arch` đặt cách người chơi `dist` px; dodge = khi quái bắt đầu gồng thì người chơi đi bộ vuông góc
function duel(arch, dist, dodge) {
  const r = newRun(11, false), map = r.scene.map, s = openSpot(map);
  const p = { x: s.x, y: s.y, inv: 0, dead: false };
  const m = makeRunEnemy(r, arch, p.x + dist, p.y, 1); m.skCd = 0;
  const hits = [], dirs = [], scene = { map, enemyShots: [] };
  let t = 0, windAt = -1, windEnd = -1, dodgeDir = null;
  const io = { map, shots: scene.enemyShots, hazards: [], ev: [], rng: r.rng, onAttack: (mm, dmg, src) => hits.push({ t, src: src || mm.arch + (mm.st === 'move' ? '' : ':' + mm.st) }) };
  for (let i = 0; i < 150 && windEnd < 0 || (windEnd >= 0 && t < windEnd + 1.2); i++) {
    t += DT;
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    const was = m.st;
    archetypeAI(m, p, dx, dy, d, DT, io);
    m.x += m.vx * DT; m.y += m.vy * DT;
    if (was !== 'windup' && m.st === 'windup') { windAt = t; dodgeDir = { x: -m.dirY || 0, y: m.dirX || 1 }; if (arch === 'elite') dodgeDir = { x: 0, y: 1 }; }
    if (m.st === 'windup') dirs.push([m.dirX, m.dirY]);
    if (was === 'windup' && m.st !== 'windup') windEnd = t;
    if (dodge && windAt >= 0 && windEnd < 0) { p.x += dodgeDir.x * PLAYER.SPEED * DT; p.y += dodgeDir.y * PLAYER.SPEED * DT; }
    updateEnemyShots(scene, p, DT, (dmg, sh) => hits.push({ t, src: sh.src }));
    if (m.st === 'recover' || (arch === 'ranged' && windEnd >= 0 && scene.enemyShots.length === 0 && t > windEnd + 0.1)) { if (windEnd >= 0 && t > windEnd + 0.05) break; }
  }
  return { windAt, windEnd, hits: hits.filter(h => h.src !== arch), dirs, A: ARCH[arch] };
}

for (const [arch, dist, src] of [['charger', 70, 'charger:dash'], ['elite', 30, 'elite:slam'], ['ranged', 120, 'ranged:shot']]) {
  test(`${arch}: không sát thương trước khi hết cảnh báo, hướng khóa không đổi, đứng yên thì trúng (${src})`, () => {
    const r = duel(arch, dist, false);
    assert.ok(r.windAt > 0, 'quái đã gồng');
    assert.ok(r.hits.length >= 1, 'đứng yên phải trúng (kịch bản có ý nghĩa)');
    for (const h of r.hits) {
      assert.equal(h.src, src);
      assert.ok(h.t >= r.windAt + r.A.WINDUP - DT * 1.5, `trúng lúc ${h.t.toFixed(2)} trước khi hết gồng ${(r.windAt + r.A.WINDUP).toFixed(2)}`);
    }
    for (const d of r.dirs) assert.deepEqual(d, r.dirs[0], 'hướng đã khóa');
  });
  test(`${arch}: né được bằng đi bộ bình thường trong lúc cảnh báo`, () => {
    const r = duel(arch, dist, true);
    assert.ok(r.windAt > 0);
    assert.equal(r.hits.length, 0, 'né rồi vẫn trúng: ' + JSON.stringify(r.hits));
  });
}

test('hướng đã khóa không quay theo người chơi (người chơi đi vòng quanh quái đang gồng)', () => {
  const r = newRun(4, false), map = r.scene.map, s = openSpot(map), p = { x: s.x, y: s.y, inv: 0, dead: false };
  const m = makeRunEnemy(r, 'charger', p.x + 70, p.y, 1); m.skCd = 0;
  const io = { map, shots: [], hazards: [], ev: [], rng: r.rng, onAttack: () => {} };
  let lock = null;
  for (let i = 0; i < 120; i++) {
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
    archetypeAI(m, p, dx, dy, d, DT, io);
    if (m.st === 'windup') { if (!lock) lock = [m.dirX, m.dirY]; assert.deepEqual([m.dirX, m.dirY], lock); const a = i * 0.2; p.x = m.x + Math.cos(a) * 70; p.y = m.y + Math.sin(a) * 70; }
    if (m.st === 'dash') { assert.deepEqual([m.dirX, m.dirY], lock); break; }
  }
  assert.ok(lock, 'đã gồng');
});

test('lối thoát: vùng mới bị bỏ bớt khi chúng bịt kín người chơi; không bỏ khi còn đường', () => {
  const r = newRun(2, true), map = r.scene.map, s = openSpot(map), p = { x: s.x, y: s.y };
  const T = BOSS.FINAL.ZONES.WINDUP, reach = PLAYER.SPEED * T * TACTICS.ESCAPE.SPEED_MUL;
  // vòng kín bán kính đúng tầm chạy + một vùng ngay chân -> không lối thoát
  const ring = Array.from({ length: 16 }, (_, i) => ({ x: p.x + Math.cos(i / 16 * 6.283) * reach * 0.75, y: p.y + Math.sin(i / 16 * 6.283) * reach * 0.75, r: reach * 0.4 }));
  const fresh = [{ x: p.x, y: p.y, r: 26 }].concat(ring);
  assert.equal(hasEscape(map, p, fresh, T), false, 'kịch bản bịt kín');
  const kept = keepEscape(map, p, [], fresh, T);
  assert.ok(kept.length < fresh.length && hasEscape(map, p, kept, T));
  const loose = [{ x: p.x, y: p.y, r: 26 }, { x: p.x + 60, y: p.y, r: 26 }];
  assert.equal(keepEscape(map, p, [], loose, T).length, 2, 'còn đường thì giữ nguyên');
});

test('Yêu Vương BẬT cờ: sau mỗi lần thả Hắc Diễm/Lao Tù người chơi luôn còn lối thoát (nhiều seed)', () => {
  let placed = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const r = newRun(seed, true), map = r.scene.map, s = openSpot(map), p = { x: s.x, y: s.y, inv: 1, dead: false };
    r.time = BOSS.FINAL.AT; r.dir.final = 'ALIVE'; r.dir.mini = 'DEAD';
    const boss = makeBoss(r, 'FINAL', p.x + 90, p.y, 1); boss.hp = boss.max = 1e9; boss.remix = true;
    for (let i = 0; i < 30 * 60; i++) {
      const before = r.scene.hazards.length;
      p.inv = 1; updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
      if (r.scene.hazards.length > before) { placed++; assert.ok(hasEscape(map, p, r.scene.hazards, Math.min(...r.scene.hazards.map(h => h.t))), `seed ${seed}: bị bịt kín lúc ${r.time.toFixed(1)}`); }
      if (boss.st === 'move' && i % 90 === 0) { p.x = s.x + ((i / 90) % 3 - 1) * 30; }
    }
  }
  assert.ok(placed >= 10, 'đã thả vùng ' + placed + ' lần');
});

test('boss không bắn đạn (Hắc Diễm Đạn/Lao Tù) khi đứng ngoài màn', () => {
  const r = newRun(3, true), map = r.scene.map, p = { x: map.cx, y: map.cy };
  const fin = makeBoss(r, 'FINAL', p.x + 420, p.y, 1); fin.remix = true;
  assert.ok(!inCameraView(map, p, fin.x, fin.y, 0));
  const io = { rng: r.rng, hazards: [], scene: r.scene, threat: null, map };
  for (let i = 0; i < 300; i++) { const k = selectBossSkill(fin, BOSS.FINAL, 420, io, p, true); assert.ok(k !== 'burst' && k !== 'prison', k); }
});

test('boss giải kẹt BẬT cờ: báo trước BLINK_WARN giây ở điểm hiện ra, hiện ra xong không cắn ngay', () => {
  const r = newRun(6, true), map = r.scene.map, s = openSpot(map), p = { x: s.x, y: s.y, inv: 0, dead: false };
  const boss = makeBoss(r, 'MINI', p.x + 160, p.y, 1); boss.speed = 0; boss.gapT = 1e9;
  const hits = [], io = { map, shots: [], hazards: [], ev: [], rng: r.rng, tactics: true, onAttack: () => hits.push(t) };
  let t = 0, blinkAt = -1, x0 = boss.x, y0 = boss.y, arrived = -1;
  for (let i = 0; i < 30 * 5; i++) {
    t += DT;
    const dx = p.x - boss.x, dy = p.y - boss.y, d = Math.hypot(dx, dy);
    archetypeAI(boss, p, dx, dy, d, DT, io);
    if (boss.st === 'blink' && blinkAt < 0) { blinkAt = t; assert.ok(Math.hypot(boss.blinkX - p.x, boss.blinkY - p.y) >= BOSS.TELEPORT_R - 1); }
    if (blinkAt >= 0 && arrived < 0) {
      if (boss.st === 'blink') assert.deepEqual([boss.x, boss.y], [x0, y0], 'chưa dịch chuyển khi còn báo trước');
      else { arrived = t; assert.ok(t - blinkAt >= TACTICS.BLINK_WARN - DT * 1.5); }
    }
    if (arrived > 0) { p.x = boss.x - 10; p.y = boss.y; }   // người chơi đứng sát chỗ boss hiện ra
    if (arrived > 0 && t > arrived + 1) break;
  }
  assert.ok(blinkAt > 0 && arrived > 0, 'boss kẹt đã giải kẹt có báo trước');
  for (const h of hits) assert.ok(h >= arrived + TACTICS.BLINK_GRACE - DT * 1.5, 'cắn ngay khi vừa hiện ra');
});

test('boss đang gồng chiêu nặng hoặc người chơi trong vùng: quái thường chỉ được BUDGET_DURING_HEAVY đòn', () => {
  const r = newRun(7, true), map = r.scene.map, p = { x: map.cx, y: map.cy };
  r.scene.hazards.push({ x: p.x, y: p.y, r: 26, t: 1, max: 1 });
  const t = threatScan(r.scene, p, 0);
  assert.ok(t.onHazard); assert.equal(t.normalCap, TACTICS.BUDGET_DURING_HEAVY);
  r.scene.hazards.length = 0;
  assert.equal(threatScan(r.scene, p, 0).normalCap, TACTICS.BUDGET.NORMAL);
});

test('nguồn sát thương mang tên chiêu (cả AI cũ và AI chiến thuật)', () => {
  for (const tactics of [false, true]) for (const [seed, at] of [[21, BOSS.MINI.AT - 2], [22, BOSS.FINAL.AT - 2], [23, 240]]) {
    const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.tactics = tactics; r.time = at;
    const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 0, dead: false };
    for (let i = 0; i < 30 * 70 && r.status === 'RUNNING'; i++) {
      const a = i / 90; p.x = r.scene.map.cx + Math.cos(a) * 60; p.y = r.scene.map.cy + Math.sin(a) * 40; p.inv = 0;
      updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
    }
    assert.ok(Object.keys(r.dmgBy).length >= 2, 'có nhận sát thương');
    for (const k of Object.keys(r.dmgBy)) assert.ok(SKILL_NAMES[k], `nguồn "${k}" chưa có tên chiêu (tactics=${tactics})`);
  }
});
