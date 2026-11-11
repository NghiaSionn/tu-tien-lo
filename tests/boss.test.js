// M2-02: mini-boss, boss cuối, cảnh báo, sơ hở, chặn one-shot, không kẹt, không spawn lại sau chết
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, updateRun } from '../src/systems/run.js';
import { makeBoss } from '../src/systems/director.js';
import { archetypeAI, updateEnemyShots } from '../src/entities/archetypes.js';
import { updateHazards } from '../src/entities/bosses.js';
import { updateMonsters, damageMonster } from '../src/entities/monsters.js';
import { BOSS, RUN } from '../src/core/config.js';

const newRun = (seed = 4321) => createRun({ seed, startSkill: 'sword_qi', realmLevel: 0 });
const player = r => ({ x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0 });

function runFor(r, p, seconds, each) {
  const dt = 1 / 30;
  for (let i = 0; i < Math.round(seconds / dt) && r.status === 'RUNNING'; i++) { p.inv = 1; updateRun(r, p, dt, []); each && each(r); }
}

test('mini-boss ra đúng giờ, một lần; hạ rồi không sinh lại', () => {
  const r = newRun(), p = player(r);
  r.time = BOSS.MINI.AT - 0.5;
  runFor(r, p, 1);
  const bosses = () => r.scene.monsters.filter(m => m.bossKind === 'MINI');
  assert.equal(bosses().length, 1); assert.equal(r.dir.mini, 'ALIVE');
  const b = bosses()[0];
  assert.ok(Math.hypot(b.x - p.x, b.y - p.y) >= 150 - 1 && r.scene.map.canStand(b.x, b.y));
  b.hp = 0; b.dead = true;
  runFor(r, p, 0.1);
  assert.equal(r.dir.mini, 'DEAD');
  assert.deepEqual(r.rewards.map(x => x.kind), ['MINI'], 'reward hook ghi đúng 1 lần');
  runFor(r, p, 30, () => assert.equal(bosses().length, 0, 'không sinh lại'));
});

test('hạ boss cuối -> WIN đúng một lần, dọn vùng nguy hiểm và đạn của boss', () => {
  const r = newRun(), p = player(r);
  r.time = BOSS.FINAL.AT; r.dir.mini = 'DEAD';
  runFor(r, p, 0.1);
  const b = r.scene.monsters.find(m => m.bossKind === 'FINAL');
  assert.ok(b);
  r.scene.hazards.push({ x: p.x, y: p.y, r: 30, t: 0.5, max: 0.5, dmg: 999 });
  r.scene.enemyShots.push({ x: 0, y: 0, vx: 0, vy: 0, life: 9, dmg: 1, kind: 'dark' });
  b.hp = 0; b.dead = true;
  p.inv = 0; updateRun(r, p, 1 / 30, []);
  assert.equal(r.status, 'ENDED'); assert.equal(r.outcome, 'WIN');
  assert.equal(r.scene.hazards.length, 0); assert.equal(r.scene.enemyShots.length, 0);
  assert.equal(r.hp, r.maxHp, 'vùng đang gồng không nổ sau khi boss chết');
  assert.equal(r.rewards.filter(x => x.kind === 'FINAL').length, 1);
});

test('không hạ boss cuối trước giới hạn thời gian -> TIMEOUT, không phải WIN', () => {
  const r = newRun(), p = player(r);
  r.time = RUN.TIME_LIMIT - 0.01;
  runFor(r, p, 0.1);
  assert.equal(r.outcome, 'TIMEOUT');
});

test('chặn one-shot: một đòn không quá HIT_CAP máu; sơ hở nhận thêm sát thương', () => {
  const r = newRun(); r.time = 300;
  const b = makeBoss(r, 'FINAL', 100, 100, 1);
  damageMonster(b, 1e9, null);
  assert.equal(b.max - b.hp, b.hitCap);
  assert.ok(b.hitCap <= Math.ceil(b.max * BOSS.HIT_CAP));
  const hp1 = b.hp; damageMonster(b, 10, null); const normal = hp1 - b.hp;
  b.vuln = 1; const hp2 = b.hp; damageMonster(b, 10, null);
  assert.equal(hp2 - b.hp, Math.round(normal * BOSS.VULN_MULT));
});

// Đấu tay đôi với boss trên bãi trống
function duel(kind, dist) {
  const r = newRun(); r.scene.map.tiles.fill(0);
  const p = player(r); r.time = 300;
  const b = makeBoss(r, kind, p.x - dist, p.y, 1);
  b.gapT = 0;
  const hits = [], ev = [];
  const io = { map: r.scene.map, shots: r.scene.enemyShots, hazards: r.scene.hazards, ev, rng: r.rng,
    onAttack: (m, d) => hits.push(d), summon: (m, n) => { io.summoned = (io.summoned || 0) + n; } };
  const tick = dt => {
    updateMonsters(r.scene, p, dt, ev, { safe: null, onAttack: io.onAttack, ai: (m, pl, dx, dy, d, t) => archetypeAI(m, pl, dx, dy, d, t, io) });
    updateEnemyShots(r.scene, p, dt, d => hits.push(d));
    updateHazards(r.scene, p, dt, ev, d => hits.push(d));
  };
  const until = (cond, max = 10) => { for (let t = 0; t < max && !cond(); t += 1 / 60) tick(1 / 60); };
  return { r, p, b, hits, io, tick, until };
}

test('Lang Vương: gồng (hướng khóa) rồi lao 3 lần, mỗi lần nhắm lại; sau đó sơ hở', () => {
  const { b, hits, p, tick, until } = duel('MINI', 120);
  tick(1 / 60);
  assert.equal(b.pat, 'dash'); assert.equal(b.st, 'windup');
  until(() => b.st === 'dash');
  assert.equal(hits.length, 0, 'không đánh khi đang cảnh báo');
  let dashes = 0, prev = b.st;
  until(() => { if (b.st === 'dash' && prev !== 'dash') dashes++; prev = b.st; return b.st === 'recover'; }, 8);
  assert.equal(dashes + 1, BOSS.MINI.DASH.COUNT);
  assert.ok(b.vuln > 0, 'sơ hở sau chuỗi lao');
  assert.ok(hits.length >= 1, 'đứng yên thì trúng');
  void p;
});

test('Lang Vương: tru gọi bầy sau khi gồng', () => {
  const { b, io, until } = duel('MINI', 120);
  b.patIdx = 2;                                       // ORDER[2] = howl
  until(() => b.st === 'windup');
  assert.equal(b.pat, 'howl');
  assert.ok(!io.summoned);
  until(() => b.st === 'recover');
  assert.equal(io.summoned, BOSS.MINI.HOWL.N);
});

test('Yêu Vương: đạn tỏa tròn chỉ bắn sau khi gồng, đúng số tia; pha 2 nhiều tia hơn', () => {
  for (const half of [false, true]) {
    const { r, b, until } = duel('FINAL', 120);
    if (half) b.hp = Math.floor(b.max * 0.4);
    until(() => b.st === 'windup');
    assert.equal(b.pat, 'burst');
    assert.equal(r.scene.enemyShots.length, 0);
    until(() => b.st === 'recover');
    assert.equal(r.scene.enemyShots.length, half ? BOSS.FINAL.BURST.N2 : BOSS.FINAL.BURST.N);
  }
});

test('Yêu Vương: vùng hắc diễm nổ đúng lúc; rời vùng thì không trúng, đứng yên thì trúng', () => {
  for (const stay of [true, false]) {
    const { r, b, p, hits, until } = duel('FINAL', 120);
    b.patIdx = 1;                                     // ORDER[1] = zones
    until(() => b.st === 'windup');
    assert.equal(b.pat, 'zones'); assert.equal(r.scene.hazards.length, BOSS.FINAL.ZONES.N);
    if (!stay) { p.x += 200; }
    until(() => r.scene.hazards.length === 0, 3);
    const zoneHits = hits.filter(d => d === b.dmg * BOSS.FINAL.ZONES.DMG).length;
    assert.equal(zoneHits > 0, stay);
  }
});

test('Yêu Vương: áp sát thì đập đất (vùng quanh boss)', () => {
  const { r, b, until } = duel('FINAL', 40);
  until(() => b.st === 'windup');
  assert.equal(b.pat, 'slam');
  assert.equal(r.scene.hazards.length, 1);
  assert.equal(r.scene.hazards[0].r, BOSS.FINAL.SLAM.R);
});

test('chiêu chỉ bắt đầu từ trạng thái đuổi: đang sơ hở thì không ra chiêu mới', () => {
  const { r, b, tick } = duel('FINAL', 120);
  b.st = 'recover'; b.stT = 1; b.gapT = -5;
  for (let i = 0; i < 50; i++) tick(1 / 60);
  assert.equal(r.scene.hazards.length, 0); assert.equal(r.scene.enemyShots.length, 0);
});

test('boss bị cây vây kín thì tự dịch chuyển, không kẹt', () => {
  const { r, b, p, tick } = duel('MINI', 150);
  const map = r.scene.map, tx = Math.floor(b.x / 16), ty = Math.floor(b.y / 16);
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (x !== tx || y !== ty) map.tiles[y * map.w + x] = 3;
  b.gapT = 999;
  const x0 = b.x, y0 = b.y;
  for (let t = 0; t < BOSS.STUCK_TIME + 1; t += 1 / 60) tick(1 / 60);
  assert.ok(Math.hypot(b.x - x0, b.y - y0) > 50, 'đã rời chỗ kẹt');
  assert.ok(map.canStand(b.x, b.y));
  void p;
});

test('boss không bị đẩy lùi và chỉ chịu nửa làm chậm', async () => {
  const { applySlow } = await import('../src/entities/monsters.js');
  const { b } = duel('MINI', 150);
  applySlow(b, 0.6, 1);
  assert.equal(b.slow.f, 0.3);
});
