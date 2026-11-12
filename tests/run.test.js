import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHubMap } from '../src/world/map.js';
import { xpToNext, addRunXp } from '../src/progression/runxp.js';
import { drawCards, applyCard, candidates, evolutionReady } from '../src/progression/draft.js';
import { SKILLS, EVOLUTIONS, PASSIVES } from '../src/data/skills.js';
import { createRun, updateRun, endRun, makeCtx, hurtRunPlayer } from '../src/systems/run.js';
import { updateSkills, updateProjectiles, chainLightning, skillParams } from '../src/systems/combat.js';
import { makeMonster, applyBurn, applySlow, updateMonsters } from '../src/entities/monsters.js';
import { mulberry32 } from '../src/core/rng.js';
import { RUN } from '../src/core/config.js';

test('bản đồ động phủ trùng từng ô với v0.1 (checksum từ baseline)', () => {
  const m = makeHubMap();
  let h = 2166136261;
  for (const v of m.tiles) { h ^= v; h = Math.imul(h, 16777619) >>> 0; }
  assert.equal(h, 1741762572);
});

const newRun = (skill = 'sword_qi', L = 0) => createRun({ seed: 1234, startSkill: skill, realmLevel: L });
const player = r => ({ x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0 });

test('EXP đủ 3 cấp cùng lúc -> đúng 3 lượt chọn thẻ, không mất/nhân đôi', () => {
  const r = newRun();
  const need3 = xpToNext(1) + xpToNext(2) + xpToNext(3);
  assert.equal(addRunXp(r, need3), 3);
  assert.equal(r.level, 4); assert.equal(r.pendingDrafts, 3); assert.equal(r.xp, 0);
  assert.equal(addRunXp(r, NaN), 0); assert.equal(addRunXp(r, -5), 0); assert.equal(addRunXp(r, Infinity), 0);
  assert.equal(r.pendingDrafts, 3);
});

test('EXP run không chạm tới metaState', () => {
  const meta = { realmLevel: 2, cultivationXp: 10 };
  const r = createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: meta.realmLevel });
  addRunXp(r, 500);
  assert.deepEqual(meta, { realmLevel: 2, cultivationXp: 10 });
});

test('bốc thẻ: không trùng, tối đa 3, cố định theo seed', () => {
  const r = newRun();
  const a = drawCards(r, mulberry32(7)), b = drawCards(r, mulberry32(7));
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map(c => c.key)).size, 3);
  assert.deepEqual(a.map(c => c.key), b.map(c => c.key));
});

test('chọn thẻ đúng một lần: áp lại cùng thẻ (bấm đúp) bị từ chối', () => {
  const r = newRun();
  const up = candidates(r).find(c => c.key === 'up:sword_qi');
  assert.equal(applyCard(r, up), true);
  assert.equal(applyCard(r, up), false, 'thẻ cũ không áp lần 2');
  assert.equal(r.skills[0].level, 2);
  const nw = candidates(r).find(c => c.key === 'new:fire_orb');
  assert.equal(applyCard(r, nw), true); assert.equal(applyCard(r, nw), false);
  assert.equal(r.skills.length, 2);
});

test('thẻ cấp tối đa và thẻ chưa triển khai không xuất hiện', () => {
  const r = newRun();
  r.skills[0].level = SKILLS.sword_qi.maxLevel;
  const keys = candidates(r).map(c => c.key);
  assert.ok(!keys.includes('up:sword_qi'));
  for (const id of ['wind_step', 'ice_needle', 'ice_nova', 'spirit_orb']) assert.ok(!keys.includes('new:' + id));
});

test('pool cạn: vẫn có thẻ dự phòng, không kẹt game', () => {
  const r = newRun();
  r.skills = ['sword_qi', 'fire_orb', 'thunder_strike', 'body_aura'].map(id => ({ id, level: SKILLS[id].maxLevel, evolved: null, st: {} }));
  for (const [id, p] of Object.entries(PASSIVES)) r.passives[id] = p.maxLevel;
  r.time = 0;
  assert.equal(candidates(r).length, 0);
  const cards = drawCards(r, mulberry32(1));
  assert.equal(cards.length, 1); assert.equal(cards[0].type, 'FALLBACK');
  let healed = 0;
  assert.equal(applyCard(r, cards[0], { heal: f => { healed = f; } }), true);
  assert.equal(healed, 0.35);
});

test('pool ít hơn 3 thẻ: hiện đúng số còn lại', () => {
  const r = newRun();
  r.skills = ['sword_qi', 'fire_orb', 'thunder_strike', 'body_aura'].map(id => ({ id, level: SKILLS[id].maxLevel, evolved: null, st: {} }));
  for (const [id, p] of Object.entries(PASSIVES)) r.passives[id] = p.maxLevel;
  r.passives.than_phap = 4;
  const cards = drawCards(r, mulberry32(1));
  assert.equal(cards.length, 1); assert.equal(cards[0].key, 'pas:than_phap');
});

for (const [evoId, e] of Object.entries(EVOLUTIONS)) {
  test(`tiến hóa ${e.name}: chỉ khi đủ điều kiện, đúng một lần`, () => {
    const r = newRun(e.base);
    r.skills[0].level = SKILLS[e.base].maxLevel;
    r.time = e.minRunTime + 1;
    assert.equal(evolutionReady(r, evoId), false, 'thiếu công pháp phụ');
    r.skills.push({ id: e.needAny[0], level: 1, evolved: null, st: {} });
    r.time = e.minRunTime - 1;
    assert.equal(evolutionReady(r, evoId), false, 'chưa đủ thời gian');
    r.time = e.minRunTime + 1;
    assert.equal(evolutionReady(r, evoId), true);
    const cards = drawCards(r, mulberry32(3));
    const card = cards.find(c => c.key === 'evo:' + evoId);
    assert.ok(card, 'thẻ tiến hóa luôn có trong bảng khi đủ điều kiện');
    assert.equal(applyCard(r, card), true);
    assert.equal(applyCard(r, card), false, 'không tiến hóa 2 lần');
    assert.equal(r.skills[0].evolved, evoId);
    assert.deepEqual(r.evolutions, [evoId]);
    assert.ok(!candidates(r).some(c => c.key === 'up:' + e.base), 'đã tiến hóa thì không còn thẻ nâng cấp cũ');
  });
}

// Chạy mô phỏng có quái đứng yên trước mặt
function arena(skills, L = 0, n = 6, chase = false) {
  const r = newRun(skills[0].id, L);
  r.skills = skills.map(s => ({ evolved: null, st: {}, ...s }));
  const p = player(r);
  for (let i = 0; i < n; i++) {
    const m = makeMonster(p.x + 40 + i * 6, p.y + (i % 2 ? 6 : -6), 1, { hp: 100000, aggro: chase });
    m.speed = chase ? 20 : 0; r.scene.monsters.push(m);
  }
  return { r, p };
}

function step(r, p, dt, ev) {
  const ctx = makeCtx(r, p, ev);
  updateSkills(ctx, dt); updateProjectiles(ctx, dt);
  return ctx;
}

test('hồi chiêu: Kiếm Khí bắn đúng nhịp, không bắn khi không có mục tiêu', () => {
  const { r, p } = arena([{ id: 'sword_qi', level: 1 }]);
  let fired = 0; const ev = [];
  for (let i = 0; i < 300; i++) { const before = r.scene.projectiles.length; step(r, p, 1 / 60, ev); if (r.scene.projectiles.length > before) fired++; r.time += 1 / 60; }
  // 5 giây, cd 0.8 -> 7 lần (bắn ngay ở khung đầu)
  assert.ok(fired >= 6 && fired <= 7, 'số lần bắn ' + fired);
  const empty = newRun(); const ep = player(empty);
  for (let i = 0; i < 120; i++) step(empty, ep, 1 / 60, []);
  assert.equal(empty.scene.projectiles.length, 0);
});

test('không bắn xuyên vật cản: quái sau cây không bị nhắm', () => {
  const r = newRun(); const p = player(r);
  const map = r.scene.map;
  // tìm một ô cây và đặt quái ngay sau nó
  let spot = null;
  for (let ty = 3; ty < map.h - 3 && !spot; ty++) for (let tx = 3; tx < map.w - 3 && !spot; tx++)
    if (map.tileAt(tx, ty) === 3 && map.tileAt(tx - 2, ty) === 0 && map.tileAt(tx + 2, ty) === 0) spot = [tx, ty];
  assert.ok(spot, 'có cây trong đấu trường');
  p.x = (spot[0] - 2) * 16 + 8; p.y = spot[1] * 16 + 10;
  const m = makeMonster((spot[0] + 2) * 16 + 8, spot[1] * 16 + 10, 1, { hp: 999 });
  r.scene.monsters.push(m);
  assert.equal(r.scene.map.lineOfSight(p.x, p.y - 8, m.x, m.y - 4), false);
  for (let i = 0; i < 60; i++) step(r, p, 1 / 60, []);
  assert.equal(r.scene.projectiles.length, 0);
});

test('đạn không trôi vô hạn: hết tầm thì biến mất', () => {
  const { r, p } = arena([{ id: 'wind_blade', level: 5 }]);
  for (let i = 0; i < 60; i++) step(r, p, 1 / 60, []);
  r.scene.monsters.length = 0;
  r.skills[0].st.cd = 1e9;
  for (let i = 0; i < 120; i++) step(r, p, 1 / 60, []);
  assert.equal(r.scene.projectiles.length, 0);
});

test('thiêu đốt và làm chậm không cộng dồn vô hạn', () => {
  const m = makeMonster(0, 0, 1, { hp: 1000 });
  for (let i = 0; i < 100; i++) { applyBurn(m, 5, 2); applySlow(m, 0.5, 1); }
  assert.equal(m.burn.dps, 5); assert.equal(m.burn.t, 2);
  applyBurn(m, 8, 1); assert.equal(m.burn.dps, 8); assert.equal(m.burn.t, 2);
  applySlow(m, 5, 1); assert.equal(m.slow.f, RUN.SLOW_MAX);
});

test('sét nhảy có giới hạn mỗi khung', () => {
  const { r, p } = arena([{ id: 'thunder_strike', level: 5 }], 0, 60);
  const ctx = makeCtx(r, p, []);
  let total = 0;
  for (let i = 0; i < 40; i++) total += chainLightning(ctx, r.scene.monsters[0], 50, 500, 1, 0, 0);
  assert.ok(total <= RUN.CHAIN_BUDGET_PER_TICK, 'tổng nhảy ' + total);
});

test('mỗi công pháp và tiến hóa: 20 giây không NaN/Infinity, sát thương dương', () => {
  const ids = Object.keys(SKILLS).filter(k => SKILLS[k].implemented);
  for (const id of ids) for (let lv = 1; lv <= SKILLS[id].maxLevel; lv++) runCheck([{ id, level: lv }], `${id} lv${lv}`);
  for (const [evoId, e] of Object.entries(EVOLUTIONS)) runCheck([{ id: e.base, level: 5, evolved: evoId }], evoId);
  function runCheck(skills, label) {
    const { r, p } = arena(skills, 9, 8, true);
    const ev = [], cx = p.x, cy = p.y, moving = skills[0].id === 'wind_step';   // Phong Ảnh Bộ chỉ ra tàn ảnh khi di chuyển
    for (let i = 0; i < 1200; i++) { if (moving) { p.x = cx + Math.cos(i * 0.05) * 30; p.y = cy + Math.sin(i * 0.05) * 30; } step(r, p, 1 / 60, ev); r.time += 1 / 60; updateMonsters(r.scene, p, 1 / 60, ev, { safe: null, onAttack: () => {} }); }
    for (const m of r.scene.monsters) { assert.ok(Number.isFinite(m.hp), `${label}: hp NaN`); assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y), `${label}: vị trí NaN`); }
    const dealt = r.scene.monsters.reduce((a, m) => a + (m.max - m.hp), 0);
    if (!['body_aura'].includes(skills[0].id) || skills[0].evolved) assert.ok(dealt > 0, `${label}: không gây sát thương`);
    assert.ok(r.scene.projectiles.length <= RUN.MAX_PROJECTILES);
    for (const t of ev.filter(e => e.type === 'text')) assert.ok(!/NaN|Infinity/.test(t.text), `${label}: chữ ${t.text}`);
  }
});

test('khiên hút sát thương và tự hồi', () => {
  const r = newRun('body_aura'); const p = player(r);
  step(r, p, 0.016, []);
  const sh = r.skills[0].st;
  assert.equal(sh.hp, r.maxHp * SKILLS.body_aura.levels[0].cap);
  const hp0 = r.hp;
  hurtRunPlayer(r, p, 5, []);
  assert.equal(r.hp, hp0, 'sát thương nhỏ bị khiên chặn');
  p.inv = 0; hurtRunPlayer(r, p, 1000, []);
  assert.ok(r.hp < hp0);
  assert.equal(sh.hp, 0);
  for (let i = 0; i < 9 * 60; i++) step(r, p, 1 / 60, []);
  assert.ok(sh.hp > 0, 'khiên hồi');
});

test('vào/ra run nhiều lần: mỗi run state mới, không chồng quái', () => {
  const seen = new Set();
  for (let k = 0; k < 5; k++) {
    const r = createRun({ seed: 99 + k, startSkill: 'sword_qi', realmLevel: 0 });
    assert.ok(!seen.has(r.id)); seen.add(r.id);
    assert.equal(r.scene.monsters.length, 0);
    assert.equal(r.level, 1); assert.equal(r.xp, 0);
    const p = player(r);
    for (let i = 0; i < 600; i++) updateRun(r, p, 1 / 60, []);
    assert.ok(r.scene.monsters.length > 0 && r.scene.monsters.length <= RUN.SPAWN.MAX_ALIVE);
    assert.equal(endRun(r, 'ABANDON'), true);
    assert.equal(endRun(r, 'WIN'), false, 'kết thúc 1 lần');
    const n = r.scene.monsters.length; updateRun(r, p, 1, []);
    assert.equal(r.scene.monsters.length, n, 'run đã kết thúc không cập nhật nữa');
  }
});

test('quái sinh ra ở chỗ đứng được, không trên người chơi', () => {
  const r = newRun(); const p = player(r);
  for (let i = 0; i < 1800; i++) updateRun(r, p, 1 / 60, []);
  for (const m of r.scene.monsters) assert.ok(r.scene.map.canStand(m.x, m.y));
});

test('chết trong run -> LOSE, không đụng meta', () => {
  const r = newRun(); const p = player(r);
  for (let i = 0; i < 100 && r.status === 'RUNNING'; i++) { p.inv = 0; hurtRunPlayer(r, p, 50, []); }
  assert.equal(r.outcome, 'LOSE'); assert.equal(r.hp, 0);
});

test('thông số công pháp hợp lệ', () => {
  for (const [id, d] of Object.entries(SKILLS)) {
    if (!d.implemented) continue;
    assert.equal(d.levels.length, d.maxLevel, id);
    assert.equal(d.levelText.length, d.maxLevel, id);
    for (const p of d.levels) for (const [k, v] of Object.entries(p)) if (k !== 'color') assert.ok(Number.isFinite(v) && v >= 0, `${id}.${k}`);
  }
  for (const e of Object.values(EVOLUTIONS)) { assert.ok(SKILLS[e.base].implemented); for (const n of e.needAny) assert.ok(SKILLS[n].implemented); assert.ok(skillParams({ id: e.base, level: 5, evolved: Object.keys(EVOLUTIONS).find(k => EVOLUTIONS[k] === e) })); }
});

test('thẻ nâng công pháp gốc nặng hơn khi đã có công pháp phụ của công thức tiến hóa', async () => {
  const { EVO_BASE_UPGRADE_MULT, WEIGHTS } = await import('../src/progression/draft.js');
  const r = newRun('sword_qi');
  r.skills.push({ id: 'body_aura', level: 2, evolved: null, st: {} });
  const w0 = candidates(r).find(c => c.key === 'up:body_aura').w;
  assert.equal(w0, WEIGHTS.UPGRADE_SKILL, 'chưa có công pháp Lôi: trọng số thường');
  r.skills.push({ id: 'thunder_strike', level: 1, evolved: null, st: {} });
  const w1 = candidates(r).find(c => c.key === 'up:body_aura').w;
  assert.equal(w1, WEIGHTS.UPGRADE_SKILL * EVO_BASE_UPGRADE_MULT);
  assert.equal(candidates(r).find(c => c.key === 'up:sword_qi').w, WEIGHTS.UPGRADE_SKILL * EVO_BASE_UPGRADE_MULT, 'Kiếm Khí cũng là gốc (Lôi Đình Vạn Kiếm)');
  assert.equal(candidates(r).find(c => c.key === 'up:thunder_strike').w, WEIGHTS.UPGRADE_SKILL, 'công pháp phụ không được nhân');
});

test('một mục tiêu (boss): mọi lưỡi Kiếm Khí cấp 5 và cả 2 Hỏa Cầu cấp 5 đều trúng', () => {
  for (const [id, n] of [['sword_qi', 3], ['fire_orb', 2]]) {
    for (const dist of [40, 90, 140]) {
      const r = newRun(); r.scene.map.tiles.fill(0);
      r.skills = [{ id, level: 5, evolved: null, st: {} }];
      const p = player(r);
      const m = makeMonster(p.x + dist, p.y, 1, { hp: 1e9 }); m.speed = 0; r.scene.monsters.push(m);
      const ev = [];
      const ctx = makeCtx(r, p, ev);
      updateSkills(ctx, 1 / 60);
      assert.equal(r.scene.projectiles.length, n);
      for (let i = 0; i < 120; i++) updateProjectiles(makeCtx(r, p, ev), 1 / 60);
      const hits = ev.filter(e => e.type === 'text' && e.y < m.y).length;
      assert.ok(hits >= n, `${id} ở ${dist}px: ${hits}/${n} trúng`);
    }
  }
});

test('Phong Ảnh Bộ: đứng yên không ra tàn ảnh; đi đủ quãng thì ra tàn ảnh và nó nổ trúng quái gần', () => {
  const { r, p } = arena([{ id: 'wind_step', level: 1 }], 0, 0);
  const ev = [];
  for (let i = 0; i < 120; i++) step(r, p, 1 / 60, ev);
  assert.equal(r.skills[0].st.images.length, 0, 'đứng yên');
  for (let i = 0; i < 80; i++) { p.x += 1; step(r, p, 1 / 60, ev); }      // đi 80 px > every 70
  const im = r.skills[0].st.images[0];
  assert.ok(im, 'có tàn ảnh');
  const m = makeMonster(im.x, im.y, 1, { hp: 1000 }); m.speed = 0; r.scene.monsters.push(m);
  for (let i = 0; i < 40; i++) step(r, p, 1 / 60, ev);                     // chờ hết delay 0,5 s
  assert.ok(ev.some(e => e.type === 'boom' && e.color === '#7ff0c8'), 'tàn ảnh đã nổ');
  assert.ok(m.hp < 1000, 'quái gần tàn ảnh bị trúng');
});

test('Linh Châu: châu chạm quái thì đánh, cùng viên không đánh lại trước hitCd', () => {
  const { r, p } = arena([{ id: 'spirit_orb', level: 1 }], 0, 0);
  const m = makeMonster(p.x + 24, p.y + 12 - 12, 1, { hp: 1000 }); m.speed = 0; r.scene.monsters.push(m);
  const ev = [];
  for (let i = 0; i < 60; i++) { step(r, p, 1 / 60, ev); r.time += 1 / 60; }   // 1 s, 2 châu, hitCd 0,5
  const hits = 1000 - m.hp;
  assert.ok(hits > 0, 'có trúng');
  const per = SKILLS.spirit_orb.levels[0].dmg * makeCtx(r, p, []).atk;
  assert.ok(hits <= per * 2 * 3 + 1e-6, 'không quá 2 châu × 3 nhịp trong 1 s');
});
