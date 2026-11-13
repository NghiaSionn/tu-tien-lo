// M7-06: gợi ý người mới — chỉ cho người chưa chơi, mỗi cái một lần, tắt được, lưu qua save, save cũ không bị làm phiền
import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldTip, markSeen, skipAll, replayTutorial, tipText, TIP_IDS } from '../src/progression/tutorial.js';
import { KEYS, loadSave, writeSave, memoryStorage, defaultMeta } from '../src/persistence/save.js';
import { makeHubMap } from '../src/world/map.js';

const map = makeHubMap();
const ctx = { canStand: map.canStand, hubSpawn: { x: map.cx, y: map.cy + 26 } };

test('người mới thấy cả 3 gợi ý, mỗi cái đúng một lần', () => {
  const m = defaultMeta(ctx.hubSpawn);
  assert.deepEqual(TIP_IDS, ['portal', 'move', 'card']);
  for (const id of TIP_IDS) { assert.ok(shouldTip(m, id)); markSeen(m, id); assert.ok(!shouldTip(m, id)); markSeen(m, id); }
  assert.deepEqual(m.tutorial.seen, TIP_IDS);
});

test('người đã chơi (runs > 0) không thấy; Tắt hướng dẫn chặn hết; Hiện lại bật lại cho cả người cũ', () => {
  const m = defaultMeta(ctx.hubSpawn); m.stats.runs = 3;
  assert.ok(TIP_IDS.every(id => !shouldTip(m, id)));
  replayTutorial(m);
  assert.ok(TIP_IDS.every(id => shouldTip(m, id)));
  skipAll(m);
  assert.ok(TIP_IDS.every(id => !shouldTip(m, id)));
  const n = defaultMeta(ctx.hubSpawn); replayTutorial(n); for (const id of TIP_IDS) markSeen(n, id);
  assert.equal(n.tutorial.replay, false);
});

test('chữ riêng cho cảm ứng và máy tính', () => {
  for (const id of TIP_IDS) assert.notEqual(tipText(id, true), tipText(id, false));
  assert.match(tipText('portal', false), /WASD/); assert.match(tipText('portal', true), /chạm/);
});

test('lưu qua save; save v1 cũ và save v2 chưa có trường tutorial vẫn nạp được', () => {
  const st = memoryStorage({});
  const m = defaultMeta(ctx.hubSpawn); markSeen(m, 'portal'); skipAll(m);
  writeSave(st, m);
  const back = loadSave(st, ctx).meta;
  assert.deepEqual(back.tutorial.seen, ['portal']); assert.equal(back.tutorial.off, true);
  const old = defaultMeta(ctx.hubSpawn); delete old.tutorial; old.stats.runs = 4; old.tutorial = { seen: ['portal', 'hack'], off: 'yes' };
  const st2 = memoryStorage({}); writeSave(st2, old);
  const b2 = loadSave(st2, ctx).meta;
  assert.deepEqual(b2.tutorial.seen, ['portal']); assert.equal(b2.tutorial.off, false);
  const v1 = loadSave(memoryStorage({ [KEYS.V1]: '{"L":3,"tuvi":40.5,"hp":120,"stones":77,"pills":4,"x":700,"y":520}' }), ctx).meta;
  assert.deepEqual(v1.tutorial, { seen: [], off: false, replay: false });
});
