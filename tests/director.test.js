// M2-01: director thời gian + kiểu quái có cảnh báo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { phaseAt, budgetAt, aliveCost, makeRunEnemy, spawnWave } from '../src/systems/director.js';
import { archetypeAI, updateEnemyShots } from '../src/entities/archetypes.js';
import { updateMonsters } from '../src/entities/monsters.js';
import { RUN, DIRECTOR, ARCH } from '../src/core/config.js';

const newRun = (seed = 1234) => createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 });
const player = r => ({ x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0 });

test('nhịp sinh nhanh dần, ngân sách tăng dần, có trần', () => {
  let prev = Infinity, prevB = 0;
  for (let t = 0; t <= 480; t += 5) {
    const e = phaseAt(t).every, b = budgetAt(t);
    assert.ok(e <= prev + 1e-9 && e > 0, 't=' + t); prev = e;
    assert.ok(b >= prevB && b <= DIRECTOR.BUDGET.MAX); prevB = b;
  }
  assert.deepEqual(Object.keys(phaseAt(0).mix), ['chaser'], 'đầu run chỉ có quái đuổi');
});

// Người chơi đi vòng theo kịch bản cố định (không phụ thuộc thời gian thật)
function script(r, p, seconds, onFrame) {
  const dt = 1 / 30, n = Math.round(seconds / dt);
  for (let i = 0; i < n && r.status === 'RUNNING'; i++) {
    const a = i * dt * 0.6;
    const nx = r.scene.map.cx + Math.cos(a) * 60, ny = r.scene.map.cy + Math.sin(a) * 40;
    if (r.scene.map.canStand(nx, ny)) { p.x = nx; p.y = ny; }
    p.inv = 1;                       // bất tử để chạy đủ lâu
    const before = r.scene.monsters.length;
    updateRun(r, p, dt, []);
    onFrame && onFrame(r, p, before);
  }
}

test('cùng seed + cùng input -> cùng diễn biến (debug tái hiện được)', () => {
  const snap = () => {
    const r = newRun(777), p = player(r);
    script(r, p, 200);
    return JSON.stringify({ k: r.kills, lv: r.level, m: r.scene.monsters.map(m => [m.arch, Math.round(m.x), Math.round(m.y), m.hp, m.st]) });
  };
  assert.equal(snap(), snap());
});

test('quái mới sinh: đứng được, không sát người chơi, không vượt trần số lượng', () => {
  for (const seed of [1, 2, 3]) {
    const r = newRun(seed), p = player(r);
    let checked = 0;
    script(r, p, 300, (r, p, before) => {
      const ms = r.scene.monsters;
      assert.ok(ms.length <= RUN.SPAWN.MAX_ALIVE);
      // quái mới luôn nằm cuối mảng (reap giữ thứ tự)
      for (let i = Math.max(0, before - 0); i < ms.length; i++) {
        const m = ms[i];
        if (m._seen) continue; m._seen = true; checked++;
        if (m.summoned) { assert.ok(Math.hypot(m.x - p.x, m.y - p.y) >= 40 - 5, 'quái được gọi không sát người chơi'); continue; }   // sinh cách ≥40, có thể đã đi 1 bước trong khung
        assert.ok(r.scene.map.canStand(m.x, m.y), 'đứng được');
        assert.ok(Math.hypot(m.x - p.x, m.y - p.y) >= DIRECTOR.SAFE_R - 1, 'không sát người chơi');
      }
    });
    assert.ok(checked > 50, 'đã kiểm ' + checked + ' con');
  }
});

test('trước đợt đầu, tổng cost quái không vượt ngân sách', () => {
  const r = newRun(5), p = player(r);
  script(r, p, DIRECTOR.WAVES[0].t - 1, r => assert.ok(aliveCost(r.scene) <= budgetAt(r.time) + 1e-9));
});

test('cả 4 kiểu quái xuất hiện theo thời gian; tinh anh có giới hạn', () => {
  const r = newRun(9), p = player(r);
  const seen = {}, firstAt = {};
  script(r, p, 330, r => {
    for (const m of r.scene.monsters) { if (m.boss) continue; seen[m.arch] = 1; firstAt[m.arch] ??= r.time; }
    assert.ok(r.scene.monsters.filter(m => m.elite).length <= DIRECTOR.ELITE.MAX_ALIVE);
  });
  assert.deepEqual(Object.keys(seen).sort(), ['charger', 'chaser', 'elite', 'ranged']);
  const tOf = a => DIRECTOR.PHASES.find(ph => ph.mix[a]).t;
  assert.ok(firstAt.charger >= tOf('charger') - 1 && firstAt.ranged >= tOf('ranged') - 1 && firstAt.elite >= DIRECTOR.ELITE.FIRST - 1, JSON.stringify(firstAt));
});

test('đợt vây tròn sinh đủ con quanh người chơi', () => {
  const r = newRun(), p = player(r);
  const n = spawnWave(r, p, { arch: 'chaser', n: 10, form: 'ring' }, 1);
  assert.ok(n >= 8, 'sinh ' + n);
  const angles = r.scene.monsters.map(m => Math.atan2(m.y - p.y, m.x - p.x));
  const quads = new Set(angles.map(a => Math.floor((a + Math.PI) / (Math.PI / 2))));
  assert.ok(quads.size >= 3, 'phủ nhiều hướng');
});

// ---- hành vi kiểu quái ----
function duel(arch, dist, dirX = 1) {
  const r = newRun(), p = player(r);
  r.time = 200;
  const m = makeRunEnemy(r, arch, p.x - dirX * dist, p.y, 1);
  r.time = 0;
  m.skCd = 0;
  const hits = [];
  const io = { map: r.scene.map, shots: r.scene.enemyShots, ev: [], onAttack: (mm, d) => hits.push(d) };
  const tick = dt => {
    updateMonsters(r.scene, p, dt, [], { safe: null, onAttack: io.onAttack, ai: (mm, pl, dx, dy, d, t) => archetypeAI(mm, pl, dx, dy, d, t, io) });
    updateEnemyShots(r.scene, p, dt, d => hits.push(d));
  };
  return { r, p, m, hits, tick };
}
// đặt bãi đất trống để kiểm hành vi, không bị cây chặn
function clearArena(r) { r.scene.map.tiles.fill(0); }

test('Hỏa Hồ: gồng (có hướng khóa) rồi mới lao; đứng trên đường lao thì trúng', () => {
  const { r, p, m, hits, tick } = duel('charger', 80);
  clearArena(r);
  tick(1 / 60);
  assert.equal(m.st, 'windup'); assert.equal(m.dirX, 1);
  const x0 = m.x;
  for (let t = 0; t < ARCH.charger.WINDUP - 0.05; t += 1 / 60) tick(1 / 60);
  assert.equal(m.st, 'windup'); assert.equal(m.x, x0, 'đứng yên khi gồng');
  assert.equal(hits.length, 0, 'chưa gây sát thương khi đang cảnh báo');
  for (let t = 0; t < 0.6; t += 1 / 60) tick(1 / 60);
  assert.ok(hits.length >= 1 && hits[0] > m.dmg, 'trúng đòn lao (mạnh hơn cắn thường)');
});

test('Hỏa Hồ: né ra khỏi đường lao trong lúc gồng thì không trúng đòn lao', () => {
  const { r, p, m, hits, tick } = duel('charger', 80);
  clearArena(r);
  tick(1 / 60);
  assert.equal(m.st, 'windup');
  p.y += 40;                               // bước ngang khỏi đường cảnh báo
  for (let t = 0; t < ARCH.charger.WINDUP + ARCH.charger.DASH_TIME + 0.1; t += 1 / 60) tick(1 / 60);
  assert.equal(hits.length, 0);
  assert.ok(m.st === 'recover' || m.st === 'move');
});

test('Huyền Băng Thú: gồng rồi bắn băng tiễn; né thì trượt, đứng yên thì trúng; cây chặn đạn', () => {
  { // đứng yên
    const { r, m, hits, tick } = duel('ranged', 120);
    clearArena(r);
    tick(1 / 60); assert.equal(m.st, 'windup');
    assert.equal(r.scene.enemyShots.length, 0);
    for (let t = 0; t < ARCH.ranged.WINDUP; t += 1 / 60) tick(1 / 60);
    assert.equal(r.scene.enemyShots.length, 1, 'bắn sau khi gồng');
    for (let t = 0; t < 1.5; t += 1 / 60) tick(1 / 60);
    assert.equal(hits.length, 1);
  }
  { // né ngang
    const { r, p, hits, tick } = duel('ranged', 120);
    clearArena(r);
    for (let t = 0; t < ARCH.ranged.WINDUP + 0.05; t += 1 / 60) tick(1 / 60);
    p.y += 30;
    for (let t = 0; t < 1.5; t += 1 / 60) tick(1 / 60);
    assert.equal(hits.length, 0);
  }
  { // cây chắn giữa: đạn biến mất
    const { r, p, hits } = duel('ranged', 120);
    clearArena(r);
    const map = r.scene.map, tx = Math.floor((p.x - 50) / 16), ty = Math.floor(p.y / 16);
    map.tiles[ty * map.w + tx] = 3;
    r.scene.enemyShots.push({ x: p.x - 110, y: p.y - 6, vx: 105, vy: 0, life: 2.4, dmg: 5 });
    for (let t = 0; t < 1.5; t += 1 / 60) updateEnemyShots(r.scene, p, 1 / 60, d => hits.push(d));
    assert.equal(hits.length, 0); assert.equal(r.scene.enemyShots.length, 0);
  }
});

test('Ma Ảnh tinh anh: đập đất sau khi gồng; ngoài vòng cảnh báo thì không trúng', () => {
  for (const [stay, expectHit] of [[true, true], [false, false]]) {
    const { r, p, m, hits, tick } = duel('elite', 30);
    clearArena(r);
    tick(1 / 60); assert.equal(m.st, 'windup');
    if (!stay) p.x += ARCH.elite.SLAM_R + 10;
    for (let t = 0; t < ARCH.elite.WINDUP - 0.05; t += 1 / 60) tick(1 / 60);
    assert.equal(hits.length, 0, 'không đánh trước khi hết cảnh báo');
    tick(0.1);
    assert.equal(hits.length > 0, expectHit);
  }
});

test('kết thúc run thì dọn đạn của quái', () => {
  const r = newRun(), p = player(r);
  r.scene.enemyShots.push({ x: 0, y: 0, vx: 0, vy: 0, life: 9, dmg: 1 });
  r.time = RUN.TIME_LIMIT; updateRun(r, p, 0.01, []);
  assert.equal(r.status, 'ENDED'); assert.equal(r.scene.enemyShots.length, 0);
});

test('băng tiễn hạ gục người chơi: run kết thúc, không lỗi khi dọn đạn giữa vòng lặp', () => {
  const r = newRun(), p = player(r);
  r.hp = 1;
  for (let i = 0; i < 5; i++) r.scene.enemyShots.push({ x: p.x, y: p.y - 7, vx: 0, vy: 0, life: 9, dmg: 50 });
  assert.doesNotThrow(() => updateRun(r, p, 1 / 60, []));
  assert.equal(r.outcome, 'LOSE'); assert.equal(r.scene.enemyShots.length, 0);
});

test('Huyền Băng Thú ngoài khung nhìn thì không bắn, chỉ tiến lại gần', () => {
  const { r, m, tick } = duel('ranged', 0);
  clearArena(r);
  m.x = r.scene.map.cx; m.y = r.scene.map.cy - (ARCH.ranged.ONSCREEN_Y + 30);   // thẳng phía trên, ngoài màn
  tick(1 / 60);
  assert.equal(m.st, 'move'); assert.equal(r.scene.enemyShots.length, 0);
  assert.ok(m.vy > 0, 'tiến về phía người chơi');
});
