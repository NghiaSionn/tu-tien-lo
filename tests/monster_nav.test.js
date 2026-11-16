// (17/11) quái bí cảnh: đi xuyên cây/đá, không xuyên nước, tự vòng qua hồ để tới người chơi
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeArenaMap, WATER, TREE, ROCK } from '../src/world/map.js';
import { makeMonster, updateMonsters } from '../src/entities/monsters.js';
import { TILE as T } from '../src/core/config.js';

test('quái đứng được trên ô cây/đá, không đứng trên nước', () => {
  const m = makeArenaMap(56, 56, 7);
  let tree = null, water = null;
  for (let y = 3; y < 53 && !(tree && water); y++) for (let x = 3; x < 53; x++) {
    const t = m.tileAt(x, y);
    if (!tree && (t === TREE || t === ROCK)) tree = [x, y];
    if (!water && t === WATER && m.tileAt(x - 1, y) === WATER && m.tileAt(x + 1, y) === WATER && m.tileAt(x, y - 1) === WATER) water = [x, y];
  }
  assert.ok(tree && water);
  assert.ok(m.monStand((tree[0] + 0.5) * T, (tree[1] + 0.8) * T), 'xuyên cây');
  assert.ok(!m.canStand((tree[0] + 0.5) * T, (tree[1] + 0.8) * T), 'người chơi vẫn bị cây chặn');
  assert.ok(!m.monStand((water[0] + 0.5) * T, (water[1] + 0.8) * T), 'nước chặn quái');
});

test('quái ở bên kia hồ vòng qua hồ tới được người chơi', () => {
  let tested = 0;
  for (const seed of [3, 7, 11, 19]) {
    const map = makeArenaMap(56, 56, seed);
    // tìm hồ rộng ≥ 5 ô theo hàng ngang; đặt người chơi một bên, quái bên kia
    let spot = null;
    for (let y = 4; y < 52 && !spot; y++) for (let x = 4; x < 46; x++) {
      if (map.tileAt(x, y) === WATER || map.tileAt(x + 1, y) !== WATER) continue;
      let k = 1; while (map.tileAt(x + k, y) === WATER) k++;
      if (k >= 6 && !map.monSolid(x, y) && !map.monSolid(x + k, y)) { spot = [x, y, k]; break; }
    }
    if (!spot) continue;
    tested++;
    const [x, y, k] = spot, player = { x: (x + 0.5) * T, y: (y + 0.7) * T, dead: false };
    const mon = makeMonster((x + k + 0.5) * T, (y + 0.7) * T, 1, { tier: 0, hp: 10, dmg: 1, speed: 40, aggro: true, xp: 1 });
    mon.alwaysAggro = true; mon.st = 'move';
    const scene = { map, monsters: [mon] };
    let reached = false;
    for (let i = 0; i < 30 * 40 && !reached; i++) {
      updateMonsters(scene, player, 1 / 30, [], { safe: null, onAttack: () => { reached = true; } });
      assert.ok(map.monStand(mon.x, mon.y), 'không đi vào nước');
    }
    assert.ok(reached, `seed ${seed}: quái không vòng qua hồ được (kẹt ở ${Math.round(mon.x / T)},${Math.round(mon.y / T)})`);
  }
  assert.ok(tested >= 2, 'đã thử ' + tested + ' hồ');
});

test('quái đông không chồng lên nhau: 30 con sinh cùng chỗ tự dàn ra', () => {
  const map = makeArenaMap(56, 56, 7), cx = map.cx + 120, cy = map.cy;
  const ms = Array.from({ length: 30 }, (_, i) => Object.assign(makeMonster(cx + (i % 3) * 0.5, cy, 1, { tier: 0, hp: 10, dmg: 1, speed: 40, aggro: true, xp: 1, ph: i }), { st: 'move' }));
  const scene = { kind: 'run', map, monsters: ms }, player = { x: map.cx, y: map.cy, dead: false };
  for (let i = 0; i < 45; i++) updateMonsters(scene, player, 1 / 30, [], { safe: null, onAttack: () => {} });
  let close = 0;
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) if (Math.hypot(ms[i].x - ms[j].x, ms[i].y - ms[j].y) < 4) close++;
  assert.ok(close <= 3, `${close} cặp còn chồng nhau (< 4 px)`);
});
