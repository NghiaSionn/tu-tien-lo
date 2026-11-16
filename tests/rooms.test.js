// M9-B: bí cảnh nhiều phòng — sơ đồ theo seed, đi tới mọi phòng, khóa/mở cửa, boss ở phòng xa nhất
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDungeon, roomAt } from '../src/world/rooms.js';
import { makeRoomsMap } from '../src/world/map.js';
import { createRun, updateRun } from '../src/systems/run.js';
import { ROOMS, TILE as T } from '../src/core/config.js';

const SEEDS = Array.from({ length: 60 }, (_, i) => (i * 2654435761) >>> 0);

test('sơ đồ: đủ phòng, đủ loại, boss ở phòng sâu nhất, Lang Vương trên đường chính, cùng seed cùng kết quả', () => {
  for (const seed of SEEDS) {
    const d = generateDungeon(seed);
    assert.ok(d.rooms.length >= ROOMS.COUNT[0] && d.rooms.length <= ROOMS.COUNT[1], `seed ${seed}: ${d.rooms.length} phòng`);
    const types = d.rooms.map(r => r.type), count = t => types.filter(x => x === t).length;
    assert.equal(count('start'), 1); assert.equal(count('boss'), 1); assert.equal(count('mini'), 1);
    for (const t of ['reward', 'shrine', 'elite']) assert.equal(count(t), 1, `seed ${seed}: thiếu ${t}`);
    const boss = d.rooms[d.boss], maxD = Math.max(...d.rooms.map(r => r.depth));
    assert.equal(boss.depth, maxD); assert.ok(boss.depth >= ROOMS.MIN_BOSS_DEPTH);
    assert.ok(d.rooms.find(r => r.type === 'mini').depth < boss.depth, 'Lang Vương trước boss cuối');
    assert.equal(d.edges.length, d.rooms.length - 1, 'cây phòng (mọi phòng nối với nhau)');
    assert.deepEqual(generateDungeon(seed).rooms.map(r => [r.gx, r.gy, r.type]), d.rooms.map(r => [r.gx, r.gy, r.type]));
  }
});

test('bản đồ: từ phòng xuất phát đi tới tâm mọi phòng (chưa phong ấn); cửa phong ấn thì chặn', () => {
  for (const seed of SEEDS.slice(0, 20)) {
    const m = makeRoomsMap(seed), d = m.rooms, W = m.w, seen = new Uint8Array(W * m.h), q = [];
    const st = d.rooms[d.start]; q.push([st.cx, st.cy]); seen[st.cy * W + st.cx] = 1;
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!seen[ny * W + nx] && !m.solidTile(nx, ny)) { seen[ny * W + nx] = 1; q.push([nx, ny]); } } }
    for (const r of d.rooms) assert.ok(seen[r.cy * W + r.cx], `seed ${seed}: phòng ${r.id} (${r.type}) không tới được`);
    const r = d.rooms[1], [dx, dy] = r.doors[0];
    assert.ok(!m.solidTile(dx, dy)); m.blocked.add(dy * W + dx); assert.ok(m.solidTile(dx, dy)); m.blocked.clear();
  }
});

const player = (x, y) => ({ x, y, fx: 1, fy: 0, inv: 0, cd: 0 });
const killAll = run => { for (const m of run.scene.monsters) { m.hp = 0; } };

test('vào phòng chiến đấu: phong ấn cửa + ra quái; dọn hết các đợt thì mở cửa, cộng phòng đã dọn', () => {
  const run = createRun({ seed: 1234, startSkill: 'sword_qi', realmLevel: 0, mode: 'rooms' });
  const d = run.scene.map.rooms, r = d.rooms.find(x => x.type === 'combat');
  const p = player((r.cx + 0.5) * T, (r.cy + 0.5) * T), ev = [];
  updateRun(run, p, 1 / 60, ev);
  assert.equal(run.rooms.active, r.id); assert.ok(run.scene.monsters.length + run.rooms.queue.length > 0, 'có quái (đã hiện hoặc đang chờ hiện)');
  const [dx, dy] = r.doors[0]; assert.ok(run.scene.map.solidTile(dx, dy), 'cửa bị phong ấn');
  for (let i = 0; i < 4000 && run.rooms.active >= 0; i++) { killAll(run); p.inv = 99; updateRun(run, p, 1 / 30, ev); }
  assert.equal(run.rooms.active, -1); assert.equal(run.rooms.rooms[r.id].state, 'cleared');
  assert.ok(!run.scene.map.solidTile(dx, dy), 'cửa mở lại'); assert.equal(run.rooms.cleared, 2);
});

test('phòng thưởng hồi máu + linh thạch; phòng boss gọi Ma Ảnh Yêu Vương, hạ boss là thắng', () => {
  const run = createRun({ seed: 77, startSkill: 'sword_qi', realmLevel: 0, mode: 'rooms' });
  const d = run.scene.map.rooms, ev = [];
  const rw = d.rooms.find(x => x.type === 'reward'); run.hp = 1;
  updateRun(run, player((rw.cx + 0.5) * T, (rw.cy + 0.5) * T), 1 / 60, ev);
  assert.ok(run.hp > 1 && run.bonusStones === ROOMS.REWARD.STONES && run.rooms.rooms[rw.id].state === 'cleared');
  const b = d.rooms[d.boss], p = player((b.cx + 0.5) * T, (b.cy + 0.5) * T);
  updateRun(run, p, 1 / 60, ev);
  const boss = run.scene.monsters.find(m => m.boss);
  assert.ok(boss && boss.bossKind === 'FINAL' && run.dir.final === 'ALIVE');
  for (let i = 0; i < 50 && run.status === 'RUNNING'; i++) { boss.hp = 0; p.inv = 99; updateRun(run, p, 1 / 30, ev); }
  assert.equal(run.outcome, 'WIN');
});

test('roomAt: tâm phòng thuộc phòng đó, hành lang không thuộc phòng nào', () => {
  const d = generateDungeon(5);
  for (const r of d.rooms) assert.equal(roomAt(d, r.cx, r.cy), r.id);
  const c = d.corridors[0]; assert.equal(roomAt(d, Math.floor((c.x0 + c.x1) / 2), Math.floor((c.y0 + c.y1) / 2)), -1);
});
