// M7-14: Bia Truyền Thừa — mỗi đoạn mở đúng 1 lần, ≤ 80 từ, lưu qua save, save cũ nạp được
import test from 'node:test';
import assert from 'node:assert/strict';
import { LORE } from '../src/data/lore.js';
import { unlockLore, unreadLore, markLoreRead, loreEntries } from '../src/progression/lore.js';
import { KEYS, loadSave, writeSave, memoryStorage, defaultMeta } from '../src/persistence/save.js';
import { makeHubMap } from '../src/world/map.js';

const map = makeHubMap();
const ctx = { canStand: map.canStand, hubSpawn: { x: map.cx, y: map.cy + 26 } };

test('5–8 đoạn, id không trùng, mỗi đoạn ≤ 80 từ', () => {
  assert.ok(LORE.length >= 5 && LORE.length <= 8);
  assert.equal(new Set(LORE.map(e => e.id)).size, LORE.length);
  for (const e of LORE) assert.ok(e.text.split(/\s+/).filter(Boolean).length <= 80, `${e.id}: ${e.text.split(/\s+/).length} từ`);
});

test('save mới chưa mở gì; mỗi mốc mở đúng 1 lần', () => {
  const m = defaultMeta(ctx.hubSpawn);
  assert.deepEqual(unlockLore(m), []);
  m.stats.runs = 1;
  assert.deepEqual(unlockLore(m, { outcome: 'LOSE' }).map(e => e.id), ['first_run', 'first_loss']);
  assert.deepEqual(unlockLore(m, { outcome: 'LOSE' }), []);
  m.stats.minis = 1; m.stats.wins = 1; m.stats.evos = ['loi_dinh_van_kiem']; m.realmLevel = 12;
  assert.deepEqual(unlockLore(m).map(e => e.id), ['first_mini', 'first_evo', 'first_win', 'truc_co', 'kim_dan']);
  assert.equal(m.lore.unlocked.length, LORE.length);
});

test('chưa đọc / đã đọc; danh sách hiển thị giữ thứ tự và khóa đoạn chưa mở', () => {
  const m = defaultMeta(ctx.hubSpawn); m.stats.runs = 1;
  unlockLore(m);
  assert.deepEqual(unreadLore(m), ['first_run']);
  const list = loreEntries(m);
  assert.equal(list.length, LORE.length); assert.ok(list[0].open && list[0].unread); assert.ok(!list[1].open);
  markLoreRead(m);
  assert.deepEqual(unreadLore(m), []);
});

test('lưu qua save; save cũ (không có lore) và giá trị lạ nạp an toàn', () => {
  const m = defaultMeta(ctx.hubSpawn); m.stats.runs = 2; unlockLore(m); markLoreRead(m);
  const st = memoryStorage({}); writeSave(st, m);
  const back = loadSave(st, ctx).meta;
  assert.deepEqual(back.lore, { unlocked: ['first_run'], read: ['first_run'] });
  assert.deepEqual(unlockLore(back), []);
  const bad = defaultMeta(ctx.hubSpawn); bad.lore = { unlocked: ['first_run', 'hack'], read: ['kim_dan'] };
  const st2 = memoryStorage({}); writeSave(st2, bad);
  assert.deepEqual(loadSave(st2, ctx).meta.lore, { unlocked: ['first_run'], read: [] });
  const v1 = loadSave(memoryStorage({ [KEYS.V1]: '{"L":3,"tuvi":40.5,"hp":120,"stones":77,"pills":4,"x":700,"y":520}' }), ctx).meta;
  assert.deepEqual(v1.lore, { unlocked: [], read: [] });
});
