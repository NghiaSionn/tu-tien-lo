// M9-D: Tham Ngộ Công Pháp (Tàng Kinh Các) — tiêu tài nguyên bí cảnh, nâng vĩnh viễn, cảm nhận được ở lượt sau
import test from 'node:test';
import assert from 'node:assert/strict';
import { buyMastery, canMaster, masteryLevel, startLevel, sanitizeMastery } from '../src/progression/mastery.js';
import { defaultMeta, sanitizeMeta, writeSave, loadSave, memoryStorage } from '../src/persistence/save.js';
import { createRun, updateRun } from '../src/systems/run.js';
import { MASTERY, RUN } from '../src/core/config.js';
import { SKILLS } from '../src/data/skills.js';

const ctx = { hubSpawn: { x: 100, y: 100 }, canStand: () => true };
const rich = (o = {}) => ({ ...defaultMeta(ctx.hubSpawn), linhThach: 5000, lingQi: 5000, ...o });

test('mua bậc 1: trừ đúng linh thạch + linh khí, bậc tăng, lượt sau bắt đầu cấp 2', () => {
  const m = rich();
  const r = buyMastery(m, 'sword_qi');
  assert.ok(r.ok);
  assert.equal(m.linhThach, 5000 - MASTERY.COST[0].linhThach); assert.equal(m.lingQi, 5000 - MASTERY.COST[0].lingQi);
  assert.equal(masteryLevel(m, 'sword_qi'), 1); assert.equal(startLevel(m, 'sword_qi'), 2);
  assert.equal(startLevel(m, 'fire_orb'), 1, 'công pháp khác không đổi');
});

test('thiếu tài nguyên / chưa đủ cảnh giới / đã tối đa / không phải công pháp khởi đầu -> từ chối, không trừ gì', () => {
  const poor = rich({ linhThach: 10, lingQi: 10 });
  assert.equal(buyMastery(poor, 'sword_qi').ok, false); assert.equal(poor.linhThach, 10);
  const low = rich({ realmLevel: 0 }); buyMastery(low, 'fire_orb');
  const c = canMaster(low, 'fire_orb');
  assert.equal(c.ok, false); assert.equal(c.needRealm, MASTERY.MIN_REALM[1]);
  const hi = rich({ realmLevel: 10 });
  for (let i = 0; i < MASTERY.MAX; i++) assert.ok(buyMastery(hi, 'thunder_strike').ok);
  const before = hi.linhThach;
  assert.equal(buyMastery(hi, 'thunder_strike').ok, false); assert.equal(hi.linhThach, before);
  assert.equal(buyMastery(rich(), 'phi_kiem').ok, false);
});

test('cấp khởi đầu không vượt maxLevel − 1 (vẫn còn thẻ nâng trong lượt)', () => {
  const m = rich({ realmLevel: 17, mastery: { sword_qi: 99 } });
  assert.ok(startLevel(m, 'sword_qi') <= SKILLS.sword_qi.maxLevel - 1);
});

test('lưu/đọc: bậc tham ngộ được giữ; giá trị lạ bị làm sạch', () => {
  const st = memoryStorage(), m = rich({ realmLevel: 5 });
  buyMastery(m, 'sword_qi'); buyMastery(m, 'sword_qi'); buyMastery(m, 'fire_orb');
  writeSave(st, m);
  const back = loadSave(st, ctx).meta;
  assert.deepEqual(back.mastery, { sword_qi: 2, fire_orb: 1 });
  assert.deepEqual(sanitizeMastery({ sword_qi: 9, fire_orb: -3, hack: 2, thunder_strike: 'x' }), { sword_qi: MASTERY.MAX });
  assert.deepEqual(sanitizeMeta({}, ctx).mastery, {});
  assert.deepEqual(defaultMeta(ctx.hubSpawn).mastery, {});
});

test('lượt sau cảm nhận được: công pháp đã tham ngộ bắt đầu cấp cao hơn và hạ quái nhanh hơn (cùng seed)', () => {
  const kills = lv => {
    const r = createRun({ seed: 77, startSkill: 'sword_qi', realmLevel: 0, startLevel: lv });
    assert.equal(r.skills[0].level, lv);
    const p = { x: r.scene.map.cx, y: r.scene.map.cy, inv: 1, dead: false, fx: 1, fy: 0 };
    for (let i = 0; i < 30 * 60 && r.status === 'RUNNING'; i++) { p.inv = 1; updateRun(r, p, 1 / 30, []); r.hp = r.maxHp; r.pendingDrafts = 0; }
    return r.kills;
  };
  const base = kills(1), up = kills(3);
  assert.ok(up > base, `cấp 3: ${up} quái / cấp 1: ${base} quái trong 60 s`);
});

test('createRun mặc định vẫn cấp 1 (save chưa tham ngộ / sim cũ không đổi)', () => {
  for (const id of RUN.START_SKILLS) assert.equal(createRun({ seed: 1, startSkill: id, realmLevel: 0 }).skills[0].level, 1);
});
