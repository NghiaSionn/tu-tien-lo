// M4: trang bị + luyện khí, thành tựu mở công pháp, Truyền Thừa Các (gacha bằng vé game), GATE v0.3b
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultMeta, sanitizeMeta, writeSave, loadSave, memoryStorage } from '../src/persistence/save.js';
import { craftItem, upgradeItem, equip, unequip } from '../src/progression/gear.js';
import { ITEMS_DEF, CRAFT, gearMods, MAX_ITEM_LEVEL } from '../src/data/items.js';
import { evaluateAchievements } from '../src/progression/achievements.js';
import { computeRunReward, stageReward, claimReward } from '../src/progression/rewards.js';
import { pull, shopBuy, rollRarity, POOL } from '../src/progression/gacha.js';
import { candidates } from '../src/progression/draft.js';
import { createRun, endRun, makeCtx } from '../src/systems/run.js';
import { updateSkills, runStats } from '../src/systems/combat.js';
import { makeMonster } from '../src/entities/monsters.js';
import { mulberry32 } from '../src/core/rng.js';
import { GACHA } from '../src/core/config.js';

const ctx = { canStand: () => true, hubSpawn: { x: 1, y: 1 } };
const rich = () => Object.assign(defaultMeta(ctx.hubSpawn), { craftMats: 500, linhThach: 5000 });

// ---- M4-01 ----
test('luyện khí: đủ nguyên liệu mới chế, không bao giờ âm; mỗi món một bản', () => {
  const m = defaultMeta(ctx.hubSpawn);
  assert.equal(craftItem(m, 'huyen_giap').ok, false); assert.equal(m.craftMats, 0); assert.equal(m.linhThach, 0);
  Object.assign(m, { craftMats: CRAFT.make.craftMats, linhThach: CRAFT.make.linhThach });
  assert.equal(craftItem(m, 'huyen_giap').ok, true); assert.equal(m.craftMats, 0); assert.equal(m.linhThach, 0);
  assert.equal(craftItem(m, 'huyen_giap').ok, false, 'không chế trùng');
  assert.equal(craftItem(m, 'khong_co').ok, false);
});

test('nâng cấp chắc chắn, có trần cấp 5, trừ đúng chi phí', () => {
  const m = rich(); craftItem(m, 'liet_hoa_dao');
  for (let lv = 1; lv < MAX_ITEM_LEVEL; lv++) {
    const before = { ...m }, c = CRAFT.upgrade(lv);
    assert.equal(upgradeItem(m, 'liet_hoa_dao').ok, true);
    assert.equal(m.craftMats, before.craftMats - c.craftMats); assert.equal(m.linhThach, before.linhThach - c.linhThach);
  }
  assert.equal(m.items.liet_hoa_dao, MAX_ITEM_LEVEL);
  const snap = JSON.stringify(m); assert.equal(upgradeItem(m, 'liet_hoa_dao').ok, false); assert.equal(JSON.stringify(m), snap);
});

test('mặc đồ đúng luật: phải sở hữu, đúng ô, một món mỗi ô; save sửa bậy bị gỡ', () => {
  const m = rich();
  assert.equal(equip(m, 'phong_hanh_y').ok, false);
  craftItem(m, 'phong_hanh_y'); craftItem(m, 'huyen_giap');
  equip(m, 'phong_hanh_y'); equip(m, 'huyen_giap');
  assert.equal(m.equipped.armor, 'huyen_giap'); assert.equal(m.equipped.weapon, null);
  unequip(m, 'armor'); assert.equal(m.equipped.armor, null);
  const bad = sanitizeMeta({ items: { huyen_giap: 99, khong_co: 1, liet_hoa_dao: -2 }, equipped: { weapon: 'huyen_giap', armor: 'huyen_giap', ring: 'sat_khi_gioi' } }, ctx);
  assert.deepEqual(bad.items, { huyen_giap: 5, liet_hoa_dao: 1 });
  assert.deepEqual(bad.equipped, { weapon: null, armor: 'huyen_giap', talisman: null, ring: null });
});

test('trang bị đổi lối chơi đo được: Phi Hành Kiếm +1 đạn nhưng giảm sát thương; Sát Khí Giới nhận thêm sát thương', () => {
  const m = rich(); craftItem(m, 'phi_hanh_kiem'); equip(m, 'phi_hanh_kiem');
  const g = gearMods(m);
  assert.equal(g.extraProj, 1); assert.ok(g.damage < 0);
  const shots = gear => {
    const r = createRun({ seed: 2, startSkill: 'sword_qi', realmLevel: 0, gear }); r.scene.map.tiles.fill(0);
    const p = { x: r.scene.map.cx, y: r.scene.map.cy, fx: 1, fy: 0, inv: 0 };
    for (let i = 0; i < 4; i++) { const mm = makeMonster(p.x + 40 + i * 10, p.y, 1, { hp: 1e9 }); mm.speed = 0; r.scene.monsters.push(mm); }
    updateSkills(makeCtx(r, p, []), 1 / 60);
    return { n: r.scene.projectiles.length, dmg: runStats(r).damage };
  };
  const a = shots(null), b = shots(g);
  assert.equal(b.n, a.n + 1); assert.ok(b.dmg < a.dmg);
  const m2 = rich(); craftItem(m2, 'sat_khi_gioi'); equip(m2, 'sat_khi_gioi');
  assert.ok(runStats(createRun({ seed: 1, startSkill: 'sword_qi', realmLevel: 0, gear: gearMods(m2) })).dmgTaken > 1);
});

// ---- M4-02 ----
test('người mới có đủ bộ cơ bản; Băng Châm khóa tới khi hạ Lang Vương (lộ trình chắc chắn), rồi vào pool thẻ', () => {
  const m = defaultMeta(ctx.hubSpawn);
  const r0 = createRun({ seed: 3, startSkill: 'sword_qi', realmLevel: 0, unlocked: m.unlocks.skills });
  const ids0 = candidates(r0).map(c => c.id);
  assert.ok(ids0.length >= 8, 'đủ công pháp cơ bản'); assert.ok(!ids0.includes('ice_needle') && !ids0.includes('ice_nova'));
  const r = createRun({ seed: 4, startSkill: 'sword_qi', realmLevel: 0 });
  Object.assign(r, { time: 260, kills: 300, level: 20 }); r.rewards = [{ kind: 'MINI', t: 230 }]; endRun(r, 'LOSE');
  stageReward(m, computeRunReward(r, m)); claimReward(m);
  const got = evaluateAchievements(m);
  assert.deepEqual(got.map(a => a.id), ['first_mini']);
  assert.ok(m.unlocks.skills.includes('ice_needle')); assert.equal(m.coDuyenTicket, 1);
  assert.deepEqual(evaluateAchievements(m), [], 'không nhận lại');
  const r1 = createRun({ seed: 5, startSkill: 'sword_qi', realmLevel: 0, unlocked: m.unlocks.skills });
  assert.ok(candidates(r1).some(c => c.id === 'ice_needle'));
  // unlock lưu qua save
  const st = memoryStorage(); writeSave(st, m);
  const back = loadSave(st, ctx).meta;
  assert.ok(back.unlocks.skills.includes('ice_needle')); assert.deepEqual(back.achievements, ['first_mini']);
});

test('thống kê run chỉ cộng một lần (đi kèm phần thưởng chờ nhận)', () => {
  const m = defaultMeta(ctx.hubSpawn);
  const r = createRun({ seed: 6, startSkill: 'sword_qi', realmLevel: 0 }); Object.assign(r, { time: 100, kills: 600, level: 10 }); endRun(r, 'LOSE');
  stageReward(m, computeRunReward(r, m)); claimReward(m); claimReward(m);
  stageReward(m, computeRunReward(r, m)); claimReward(m);
  assert.equal(m.stats.kills, 600);
});

// ---- M4-03 ----
test('0 vé không quay được, không đổi gì', () => {
  const m = defaultMeta(ctx.hubSpawn);
  const snap = JSON.stringify(m);
  assert.equal(pull(m, Math.random), null); assert.equal(JSON.stringify(m), snap);
});

test('tỉ lệ khớp cấu hình (20000 lượt, seed cố định) và bảo hiểm không bao giờ vượt PITY', () => {
  const m = defaultMeta(ctx.hubSpawn); m.coDuyenTicket = 20000;
  const rng = mulberry32(42), cnt = { common: 0, rare: 0, epic: 0 };
  let since = 0, maxGap = 0;
  for (let i = 0; i < 20000; i++) {
    const r = pull(m, rng); cnt[r.rarity]++;
    since = r.rarity === 'epic' ? 0 : since + 1; maxGap = Math.max(maxGap, since);
  }
  assert.ok(maxGap < GACHA.PITY, 'chuỗi không Cực phẩm dài nhất ' + maxGap);
  // tỉ lệ thô khớp (bảo hiểm làm Cực phẩm cao hơn một chút)
  assert.ok(Math.abs(cnt.rare / 20000 - GACHA.RATES.rare) < 0.02, 'hiếm ' + cnt.rare);
  assert.ok(cnt.epic / 20000 >= GACHA.RATES.epic && cnt.epic / 20000 < GACHA.RATES.epic + 0.03, 'cực phẩm ' + cnt.epic);
  assert.equal(m.coDuyenTicket, 0);
  assert.equal(m.gacha.history.length, GACHA.HISTORY);
});

test('bảo hiểm: đúng lượt PITY chắc chắn Cực phẩm', () => {
  const m = defaultMeta(ctx.hubSpawn); m.gacha.pity = GACHA.PITY - 1;
  assert.equal(rollRarity(m, () => 0.99), 'epic');
  m.gacha.pity = 0; assert.equal(rollRarity(m, () => 0.99), 'common');
});

test('trùng đổi mảnh đúng; đổi mảnh lấy đúng mục tiêu; không đủ mảnh thì không đổi', () => {
  const m = defaultMeta(ctx.hubSpawn); m.coDuyenTicket = 2;
  const it = POOL.rare[0];
  m.items[it.id] = 1;
  const r = pull(m, (() => { const seq = [0.1, 0]; let i = 0; return () => seq[i++ % 2]; })());   // hiếm, món đầu
  assert.equal(r.rarity, 'rare'); assert.equal(r.dup, true); assert.equal(m.shards, GACHA.DUP_SHARDS.rare);
  assert.equal(shopBuy(m, 'skill', 'ice_nova').ok, false); assert.ok(!m.unlocks.skills.includes('ice_nova'));
  m.shards = GACHA.SHOP.skill;
  assert.equal(shopBuy(m, 'skill', 'ice_nova').ok, true); assert.equal(m.shards, 0); assert.ok(m.unlocks.skills.includes('ice_nova'));
  assert.equal(shopBuy(m, 'skill', 'ice_nova').ok, false, 'đã có thì không đổi lại');
});

test('kết quả quay tất định theo trạng thái save: tải lại không đổi được kết quả, không nhân bản', () => {
  const st = memoryStorage();
  const m = defaultMeta(ctx.hubSpawn); m.coDuyenTicket = 5; writeSave(st, m);
  const a = loadSave(st, ctx).meta, b = loadSave(st, ctx).meta;
  const ra = [pull(a), pull(a)].map(x => x.name), rb = [pull(b), pull(b)].map(x => x.name);
  assert.deepEqual(ra, rb);
  assert.equal(a.coDuyenTicket, 3);
});

test('không có đường tiền thật trong Truyền Thừa Các', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/progression/gacha.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
  assert.ok(!/(nạp|payment|purchase|price|\$\d|VND|USD)/i.test(src.replace(/không nạp tiền/gi, '')), 'không có chữ nạp tiền/thanh toán');
});

// ---- GATE v0.3b ----
test('GATE v0.3b: run kiếm tài nguyên -> luyện/nâng đồ + quay -> run mới với build mới; nhận lại không nhân bản', () => {
  const st = memoryStorage();
  let m = defaultMeta(ctx.hubSpawn);
  const r = createRun({ seed: 9, startSkill: 'sword_qi', realmLevel: 0 });
  Object.assign(r, { time: 400, kills: 700, level: 33, eliteKills: 3 }); r.rewards = [{ kind: 'MINI', t: 230 }, { kind: 'FINAL', t: 400 }]; endRun(r, 'WIN');
  m.stats.wins = 1;
  stageReward(m, computeRunReward(r, m)); writeSave(st, m);
  m = loadSave(st, ctx).meta; claimReward(m); claimReward(m); evaluateAchievements(m); writeSave(st, m);
  const mats = m.craftMats, tickets = m.coDuyenTicket;
  assert.ok(mats >= CRAFT.make.craftMats && tickets >= 2, `mats ${mats} vé ${tickets}`);
  assert.ok(m.unlocks.skills.includes('ice_needle') && m.unlocks.skills.includes('ice_nova'));
  assert.equal(craftItem(m, 'phi_hanh_kiem').ok, true); equip(m, 'phi_hanh_kiem');
  const before = m.coDuyenTicket; pull(m); assert.equal(m.coDuyenTicket, before - 1);
  writeSave(st, m); m = loadSave(st, ctx).meta;
  assert.equal(m.equipped.weapon, 'phi_hanh_kiem');
  const r2 = createRun({ seed: 10, startSkill: 'ice_needle', realmLevel: 0, unlocked: m.unlocks.skills, gear: gearMods(m) });
  assert.deepEqual(r2.skills.map(s => s.id), ['ice_needle']); assert.equal(r2.gear.extraProj, 1);
  assert.equal(claimReward(m), null, 'phần thưởng run cũ không nhận lại');
  assert.ok(ITEMS_DEF[Object.keys(m.items)[0]]);
});
