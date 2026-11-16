// M9: đăng nhập + lưu trên mây — chọn bản tiến xa hơn, không bao giờ chạm tutien_save_v1
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickFurther, parseWrapped, defaultMeta, writeSave, memoryStorage, KEYS, localSavedAt } from '../src/persistence/save.js';

const ctx = { canStand: () => true, hubSpawn: { x: 100, y: 100 } };
const M = (o = {}) => ({ ...defaultMeta(ctx.hubSpawn), ...o, stats: { ...defaultMeta(ctx.hubSpawn).stats, ...(o.stats || {}) } });

test('giữ bản cảnh giới cao hơn, rồi tu vi, rồi số lượt; bằng nhau giữ bản lưu sau', () => {
  assert.equal(pickFurther({ meta: M({ realmLevel: 5 }) }, { meta: M({ realmLevel: 3 }) }), 'local');
  assert.equal(pickFurther({ meta: M({ realmLevel: 3 }) }, { meta: M({ realmLevel: 5 }) }), 'cloud');
  assert.equal(pickFurther({ meta: M({ realmLevel: 3, cultivationXp: 10 }) }, { meta: M({ realmLevel: 3, cultivationXp: 40 }) }), 'cloud');
  assert.equal(pickFurther({ meta: M({ stats: { runs: 9 } }) }, { meta: M({ stats: { runs: 2 } }) }), 'local');
  assert.equal(pickFurther({ meta: M(), savedAt: 5 }, { meta: M(), savedAt: 9 }), 'cloud');
  assert.equal(pickFurther({ meta: M(), savedAt: 9 }, { meta: M(), savedAt: 5 }), 'local');
  assert.equal(pickFurther({ meta: M() }, null), 'local');
});

test('parseWrapped đọc đúng bản writeSave, từ chối dữ liệu hỏng; không ghi tutien_save_v1', () => {
  const st = memoryStorage({ [KEYS.V1]: '{"L":2,"tuvi":5,"hp":10,"stones":1,"pills":0,"x":1,"y":1}' });
  const raw = writeSave(st, M({ realmLevel: 4, linhThach: 77 }));
  const w = parseWrapped(raw, ctx);
  assert.equal(w.meta.realmLevel, 4); assert.equal(w.meta.linhThach, 77); assert.ok(w.savedAt > 0);
  assert.equal(localSavedAt(st), w.savedAt);
  assert.equal(parseWrapped('{rác', ctx), null); assert.equal(parseWrapped('{"version":1}', ctx), null);
  assert.equal(st.getItem(KEYS.V1), '{"L":2,"tuvi":5,"hp":10,"stones":1,"pills":0,"x":1,"y":1}');
});
