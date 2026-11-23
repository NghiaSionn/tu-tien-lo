// M8-16: đổi qua lại sảnh tông môn (mới) / động phủ (cũ) + tải lại nhiều lần không hỏng save, không nhân tài nguyên,
// vị trí không hợp lệ ở bản đồ kia được đưa về điểm đứng hợp lệ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHubMap, makeSectMap } from '../src/world/map.js';
import { HUB } from '../src/core/config.js';
import { defaultMeta, writeSave, loadSave, memoryStorage, KEYS } from '../src/persistence/save.js';
import { stageReward, claimReward } from '../src/progression/rewards.js';
import { buyMastery } from '../src/progression/mastery.js';

const maps = { old: makeHubMap(), sect: makeSectMap() };
const ctxOf = m => ({ canStand: m.canStand, hubSpawn: { x: m.cx + HUB.RESPAWN.dx, y: m.cy + HUB.RESPAWN.dy } });

// tiến độ "đầy đủ" để so sánh: mọi loại tài nguyên + trang bị + thành tựu + mở khóa + tham ngộ
function richMeta(ctx) {
  const m = { ...defaultMeta(ctx.hubSpawn), realmLevel: 6, cultivationXp: 10, linhThach: 900, lingQi: 700, pills: 5, craftMats: 12, coDuyenTicket: 3, shards: 4 };
  m.items = { phi_hanh_kiem: 2 }; m.equipped = { ...m.equipped, weapon: 'phi_hanh_kiem' };
  m.unlocks = { skills: ['phi_kiem'], tier: 1 };
  buyMastery(m, 'sword_qi');
  return m;
}
const progress = m => JSON.stringify({ realm: m.realmLevel, xp: m.cultivationXp, lt: m.linhThach, lq: m.lingQi, pills: m.pills, mats: m.craftMats, tk: m.coDuyenTicket,
  items: m.items, eq: m.equipped, ach: m.achievements, un: m.unlocks, ma: m.mastery, log: m.rewardLog, pend: m.pendingReward && m.pendingReward.id });

// điểm đứng được ở bản đồ A nhưng KHÔNG đứng được ở bản đồ B
function posOnlyIn(a, b) {
  for (let y = 40; y < a.ph - 40; y += 13) for (let x = 40; x < a.pw - 40; x += 13) if (a.canStand(x, y) && !b.canStand(x, y)) return { x, y };
  return null;
}

test('vị trí lưu ở sảnh mới nhưng chặn ở động phủ cũ (và ngược lại) -> đưa về điểm đứng hợp lệ, không lỗi', () => {
  for (const [from, to] of [['sect', 'old'], ['old', 'sect']]) {
    const pos = posOnlyIn(maps[from], maps[to]);
    assert.ok(pos, `có vị trí chỉ đứng được ở ${from}`);
    const st = memoryStorage(), cf = ctxOf(maps[from]), ct = ctxOf(maps[to]);
    writeSave(st, { ...richMeta(cf), hubPos: pos });
    const r = loadSave(st, ct);
    assert.ok(maps[to].canStand(r.meta.hubPos.x, r.meta.hubPos.y), `${from}->${to}: vị trí sau khi tải phải đứng được`);
    assert.ok(r.warnings.some(w => /vị trí/.test(w)));
  }
});

test('3 lần đổi chế độ sảnh + tải lại liên tiếp: tiến độ không đổi, không nhân tài nguyên, không nhận thưởng trùng', () => {
  const st = memoryStorage();
  let ctx = ctxOf(maps.sect);
  const m0 = richMeta(ctx);
  stageReward(m0, { id: 'run-42', outcome: 'WIN', firstClear: false, bosses: ['MINI'], linhThach: 50, lingQi: 30, craftMats: 2, tickets: 1, summary: null });
  writeSave(st, m0);
  const want = progress(m0);
  let meta = m0;
  for (let i = 0; i < 6; i++) {   // sect -> old -> sect -> old -> sect -> old
    ctx = ctxOf(i % 2 ? maps.sect : maps.old);
    meta = loadSave(st, ctx).meta;
    assert.equal(progress(meta), want, `lần ${i + 1}: tiến độ thay đổi khi đổi sảnh`);
    writeSave(st, meta);
  }
  // nhận thưởng đúng một lần, kể cả nhận lại sau khi đổi sảnh + tải lại
  claimReward(meta); writeSave(st, meta);
  const after = loadSave(st, ctxOf(maps.sect)).meta;
  assert.equal(after.linhThach, m0.linhThach + 50); assert.equal(after.pendingReward, null);
  assert.equal(claimReward(after), null);
  stageReward(after, { id: 'run-42', outcome: 'WIN', firstClear: false, bosses: [], linhThach: 50, lingQi: 0, craftMats: 0, tickets: 0, summary: null });
  assert.equal(claimReward(after), null, 'thưởng đã nhận không nhận lại được');
  assert.equal(st.getItem(KEYS.V1), null, 'không tạo/ghi tutien_save_v1');
});

test('save v1 cũ: tải được ở cả hai chế độ sảnh, khóa v1 giữ nguyên', () => {
  const v1 = JSON.stringify({ L: 4, tuvi: 20, hp: 80, stones: 66, pills: 3, x: 120, y: 130 });
  for (const m of [maps.old, maps.sect]) {
    const st = memoryStorage({ [KEYS.V1]: v1 });
    const r = loadSave(st, ctxOf(m));
    assert.equal(r.meta.realmLevel, 4); assert.equal(r.meta.linhThach, 66);
    assert.ok(m.canStand(r.meta.hubPos.x, r.meta.hubPos.y));
    writeSave(st, r.meta);
    assert.equal(st.getItem(KEYS.V1), v1);
  }
});
