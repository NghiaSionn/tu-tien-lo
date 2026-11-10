import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEYS, loadSave, writeSave, commitMigration, importSave, exportSave, memoryStorage, defaultMeta } from '../src/persistence/save.js';
import { makeHubMap } from '../src/world/map.js';
import { need } from '../src/progression/realm.js';

const map = makeHubMap();
const ctx = { canStand: map.canStand, hubSpawn: { x: map.cx, y: map.cy + 26 } };
const V1 = '{"L":3,"tuvi":40.5,"hp":120,"stones":77,"pills":4,"x":700,"y":520}';

test('save v1 mẫu migrate sang v2 giữ L, tu vi, HP, linh thạch, đan, vị trí', () => {
  const st = memoryStorage({ [KEYS.V1]: V1 });
  const r = loadSave(st, ctx);
  assert.equal(r.source, 'v1');
  assert.deepEqual([r.meta.realmLevel, r.meta.cultivationXp, r.meta.hp, r.meta.linhThach, r.meta.pills], [3, 40.5, 120, 77, 4]);
  assert.deepEqual(r.meta.hubPos, { x: 700, y: 520 });
  assert.equal(commitMigration(st, r.meta, ctx), true);
  assert.equal(st.getItem(KEYS.V1), V1, 'v1 không bị ghi đè');
  assert.equal(st.getItem(KEYS.V1_BACKUP), V1, 'có bản sao v1');
  const again = loadSave(st, ctx);
  assert.equal(again.source, 'v2');
  assert.deepEqual(again.meta, r.meta);
});

test('lưu nhiều lần: v1 vẫn nguyên, v1_backup không bị thay, v2_bak là bản liền trước', () => {
  const st = memoryStorage({ [KEYS.V1]: V1 });
  const m = loadSave(st, ctx).meta;
  writeSave(st, m);
  m.linhThach = 999; writeSave(st, m);
  m.linhThach = 1000; writeSave(st, m);
  assert.equal(st.getItem(KEYS.V1), V1);
  assert.equal(st.getItem(KEYS.V1_BACKUP), V1);
  assert.equal(JSON.parse(st.getItem(KEYS.V2_BAK)).meta.linhThach, 999);
  assert.equal(loadSave(st, ctx).meta.linhThach, 1000);
});

test('v2 hỏng: không crash, giữ bản hỏng, phục hồi từ v2_bak', () => {
  const st = memoryStorage({ [KEYS.V1]: V1 });
  const m = loadSave(st, ctx).meta;
  writeSave(st, m); m.pills = 9; writeSave(st, m);
  const broken = '{"version":2,"meta":{"realmLevel":5';
  st.setItem(KEYS.V2, broken);
  const r = loadSave(st, ctx);
  assert.equal(r.source, 'v2_bak'); assert.equal(r.recovered, true);
  assert.equal(r.meta.realmLevel, 3);
  assert.equal(st.getItem(KEYS.V2_CORRUPT), broken);
  assert.equal(st.getItem(KEYS.V1), V1);
});

test('v2 hỏng và không có bak: lùi về v1, không xóa gì', () => {
  const st = memoryStorage({ [KEYS.V1]: V1, [KEYS.V2]: 'khong phai json' });
  const r = loadSave(st, ctx);
  assert.equal(r.source, 'v1'); assert.equal(r.meta.linhThach, 77);
  assert.equal(st.getItem(KEYS.V2), 'khong phai json', 'chưa ghi đè cho tới khi lưu');
});

test('v1 hỏng: bắt đầu mới, giữ nguyên khóa v1', () => {
  const st = memoryStorage({ [KEYS.V1]: '{oops' });
  const r = loadSave(st, ctx);
  assert.equal(r.source, 'new'); assert.equal(st.getItem(KEYS.V1), '{oops');
  assert.ok(r.warnings.length > 0);
});

test('dữ liệu độc hại/biên bị kẹp về hợp lệ', () => {
  const evil = '{"L":1e9,"tuvi":"NaN","hp":-50,"stones":-100,"pills":1.7,"x":1e9,"y":-3,"__proto__":{"polluted":true}}';
  const r = loadSave(memoryStorage({ [KEYS.V1]: evil }), ctx);
  assert.equal(r.meta.realmLevel, 17);
  assert.equal(r.meta.cultivationXp, 0);
  assert.ok(r.meta.hp > 0);
  assert.equal(r.meta.linhThach, 0);
  assert.equal(r.meta.pills, 1);
  assert.deepEqual(r.meta.hubPos, ctx.hubSpawn);
  assert.equal({}.polluted, undefined);
  const big = loadSave(memoryStorage({ [KEYS.V1]: '{"L":2,"tuvi":99999,"hp":1e12,"stones":5e15,"pills":3,"x":640,"y":506}' }), ctx).meta;
  assert.equal(big.cultivationXp, need(2));
  assert.equal(big.linhThach, 1e9);
});

test('save mới khi chưa có gì', () => {
  const r = loadSave(memoryStorage(), ctx);
  assert.equal(r.source, 'new');
  assert.deepEqual(r.meta, defaultMeta(ctx.hubSpawn));
});

test('xuất/nhập JSON: vòng tròn, nhận cả định dạng v1, từ chối rác', () => {
  const m = { ...defaultMeta(ctx.hubSpawn), realmLevel: 4, linhThach: 12 };
  const back = importSave(exportSave(m), ctx);
  assert.equal(back.ok, true); assert.deepEqual(back.meta, m);
  assert.equal(importSave(V1, ctx).meta.linhThach, 77);
  assert.equal(importSave('[1,2,3]', ctx).ok, false);
  assert.equal(importSave('{bad', ctx).ok, false);
  assert.equal(importSave('x'.repeat(300000), ctx).ok, false);
});
