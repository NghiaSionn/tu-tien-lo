// M10-06: Huyền Băng Thú — Tam Băng Tiễn (chỉ khi run.skillsV2)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeRunEnemy, inCameraView } from '../src/systems/director.js';
import { archetypeAI, updateEnemyShots } from '../src/entities/archetypes.js';
import { ICE_FAN as IF, ARCH, RUN, PLAYER, TILE as T } from '../src/core/config.js';
import { TREE, ROCK } from '../src/world/map.js';

const DT = 1 / 30;

// Chỗ trống: hành lang ngang dài 180 px, rộng ±70 px (đường tiễn + khe né) không cây/đá/nước
function openSpot(map) {
  for (let k = 0; k < 3000; k++) {
    const x = map.cx + ((k * 37) % 600) - 300, y = map.cy + ((k * 53) % 500) - 250;
    let ok = true;
    for (let ox = -20; ox <= 180 && ok; ox += 10) for (let oy = -56; oy <= 56; oy += 14) {
      if (!map.canStand(x + ox, y + oy) || map.blocksShot(x + ox, y + oy + 6)) { ok = false; break; }
    }
    if (ok) return { x, y };
  }
  return null;
}
// tạo lượt có chỗ trống: thử seed kế tiếp nếu bản đồ seed này quá rậm
function runWithSpot(seed) {
  for (let k = 0; k < 40; k++) { const r = createRun({ seed: seed * 100 + k, startSkill: 'sword_qi', realmLevel: 0 }); const s = openSpot(r.scene.map); if (s) return [r, s]; }
  throw new Error('không có khoảng trống');
}

// Một Huyền Băng Thú cách người chơi `dist` px. sidestep: số giây người chơi đi ngang sau khi nó bắt đầu gồng.
function volley(seed, skillsV2, dist, sidestep = 0) {
  const [r, s] = runWithSpot(seed); r.scene.monsters.length = 0;
  const sc = r.scene, map = sc.map, p = { x: s.x, y: s.y, inv: 0, dead: false };
  const m = makeRunEnemy(r, 'ranged', p.x + dist, p.y, 1); m.skCd = 0; m.fanCd = 0;
  m.speed = 0;   // đứng yên để giữ đúng khoảng cách thử
  const io = { map, shots: sc.enemyShots, hazards: sc.hazards, ev: [], rng: r.rng, scene: sc, skillsV2, onAttack: () => {} };
  const hits = []; let t = 0, windAt = -1, fired = -1, lock = null, side = null, wasFan = false;
  for (let i = 0; i < 30 * 5; i++) {
    t += DT;
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
    const was = m.st;
    archetypeAI(m, p, dx, dy, d, DT, io);
    if (was !== 'windup' && m.st === 'windup' && windAt < 0) { windAt = t; lock = [m.dirX, m.dirY]; side = { x: -m.dirY, y: m.dirX }; wasFan = !!m.fan; }
    if (m.st === 'windup' && windAt > 0 && fired < 0) assert.deepEqual([m.dirX, m.dirY], lock, 'hướng đã khóa');
    if (was === 'windup' && m.st !== 'windup' && fired < 0) fired = sc.enemyShots.length;
    if (windAt > 0 && t - windAt < sidestep) { p.x += side.x * PLAYER.SPEED * DT; p.y += side.y * PLAYER.SPEED * DT; }
    updateEnemyShots(sc, p, DT, (dmg, sh) => hits.push({ t, src: sh.src }));
    if (fired >= 0 && sc.enemyShots.length === 0) break;
  }
  return { windAt, fired, hits, wasFan, r };
}

test('TẮT: chỉ bắn 1 tiễn như cũ, kể cả khi đứng xa', () => {
  const v = volley(1, false, 160);
  assert.equal(v.fired, 1); assert.equal(v.wasFan, false);
});

test('BẬT + đủ xa: gồng lâu hơn, hướng khóa, bắn đúng 3 tiễn lệch ±SPREAD; đứng yên thì trúng tiễn giữa', () => {
  for (const seed of [1, 2, 3]) {
    const v = volley(seed, true, 160);
    assert.equal(v.wasFan, true); assert.equal(v.fired, 3, `seed ${seed}`);
    assert.ok(v.hits.length >= 1 && v.hits.every(h => h.src === 'ranged:fan'));
    assert.ok(v.hits[0].t >= v.windAt + IF.WINDUP, 'không trúng trước khi hết gồng');
  }
});

test('Tam Băng Tiễn: góc giữa các tiễn đúng SPREAD', () => {
  const [r, s] = runWithSpot(4); r.scene.monsters.length = 0;
  const sc = r.scene, map = sc.map, p = { x: s.x, y: s.y };
  const m = makeRunEnemy(r, 'ranged', p.x + 160, p.y, 1); m.st = 'windup'; m.stT = 0.001; m.fan = true; m.dirX = -1; m.dirY = 0;
  archetypeAI(m, p, p.x - m.x, 0, 160, DT, { map, shots: sc.enemyShots, hazards: [], ev: [], rng: r.rng, scene: sc, skillsV2: true, onAttack: () => {} });
  // góc so với hướng đã khóa (-1, 0): đúng 0, -SPREAD, +SPREAD
  const rel = sc.enemyShots.map(s => Math.atan2(-s.vy * 1 + 0, -s.vx)).sort((a, b) => a - b);   // xoay về hướng +x
  assert.equal(rel.length, 3);
  [-IF.SPREAD, 0, IF.SPREAD].forEach((a, i) => assert.ok(Math.abs(rel[i] - a) < 1e-6, rel.join(',')));
});

test('khe giữa các tiễn né được bằng đi ngang ngắn (0,35 s) trong lúc gồng', () => {
  let tested = 0;
  for (const seed of [1, 2, 3]) {
    const v = volley(seed, true, 160, 0.35);
    if (!v.wasFan) continue;
    tested++;
    assert.equal(v.hits.length, 0, `seed ${seed}: vào khe vẫn trúng ${JSON.stringify(v.hits)}`);
  }
  assert.equal(tested, 3);
});

test('gần hơn MIN_D: vẫn bắn 1 tiễn (quạt chỉ khi đủ xa)', () => {
  const v = volley(2, true, IF.MIN_D - 20);
  assert.equal(v.wasFan, false); assert.equal(v.fired, 1);
});

test('cây/đá chặn tiễn quạt như tiễn thường', () => {
  const r = createRun({ seed: 7, startSkill: 'sword_qi', realmLevel: 0 }), map = r.scene.map;
  let tile = null;
  for (let y = 3; y < 53 && !tile; y++) for (let x = 3; x < 53; x++) { const t = map.tileAt(x, y); if ((t === TREE || t === ROCK) && map.blocksShot((x + 0.5) * T, (y + 0.5) * T)) { tile = [x, y]; break; } }
  assert.ok(tile);
  const tx = (tile[0] + 0.5) * T, ty = (tile[1] + 0.5) * T - 6;
  const sc = { map, enemyShots: [{ x: tx - 40, y: ty, vx: 105, vy: 0, life: 3, dmg: 1, src: 'ranged:fan' }] };
  const p = { x: tx + 40, y: ty + 7, dead: false }, hits = [];
  for (let i = 0; i < 60 && sc.enemyShots.length; i++) updateEnemyShots(sc, p, DT, () => hits.push(1));
  assert.equal(sc.enemyShots.length, 0); assert.equal(hits.length, 0, 'tiễn xuyên cây/đá');
});

test('nhiều Huyền Băng Thú: tối đa MAX_ACTIVE con gồng quạt trong khung nhìn; không vượt trần đạn', () => {
  for (const seed of [11, 12]) {
    const r = createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 }); r.skillsV2 = true; r.scene.monsters.length = 0;
    const map = r.scene.map, p = { x: map.cx, y: map.cy, inv: 1, dead: false };
    for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; const m = makeRunEnemy(r, 'ranged', p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 110, 1); m.skCd = 0; m.fanCd = 0; m.spec = true; }   // M10-08: thử cơ chế quạt, bỏ qua trần specialist
    let fans = 0;
    for (let i = 0; i < 30 * 30; i++) {
      p.inv = 1; const before = r.scene.monsters.map(m => m.fan && m.st === 'windup');
      updateRun(r, p, DT, []); r.hp = r.maxHp; r.pendingDrafts = 0;
      let n = 0;
      r.scene.monsters.forEach((m, k) => { if (m.fan && m.st === 'windup' && inCameraView(map, p, m.x, m.y, 0)) n++; if (!before[k] && m.fan && m.st === 'windup') fans++; });
      assert.ok(n <= IF.MAX_ACTIVE, `seed ${seed}: ${n} con cùng gồng quạt`);
      assert.ok(r.scene.enemyShots.length <= RUN.MAX_ENEMY_SHOTS);
    }
    assert.ok(fans >= 3, `seed ${seed}: chỉ ${fans} lần quạt`);
  }
});
