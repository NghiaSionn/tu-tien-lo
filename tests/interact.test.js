// M8-03: tương tác "đi tới + E" dùng chung
import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestPoint, makeInteractor } from '../src/systems/interact.js';

const P = (id, x, y, r = 30, actions = [{ id: 'a', run() {} }], when) => ({ id, name: id, x, y, r, actions, when });

test('chọn điểm gần nhất trong bán kính; ngoài bán kính -> null', () => {
  const pts = [P('a', 0, 0), P('b', 50, 0)];
  assert.equal(nearestPoint(pts, 5, 0).id, 'a');
  assert.equal(nearestPoint(pts, 45, 0).id, 'b');
  assert.equal(nearestPoint(pts, 200, 0), null);
});

test('hai điểm sát nhau: hòa thì giữ điểm đang chọn (không nhảy qua lại)', () => {
  const pts = [P('a', 0, 0), P('b', 20, 0)];
  const cur = nearestPoint(pts, 9, 0);   // gần a hơn
  assert.equal(cur.id, 'a');
  assert.equal(nearestPoint(pts, 11, 0, cur).id, 'a');   // lệch 2 px sang b vẫn giữ a
  assert.equal(nearestPoint(pts, 15, 0, cur).id, 'b');
});

test('điểm có when() = false bị bỏ qua', () => {
  const pts = [P('a', 0, 0, 30, undefined, () => false), P('b', 25, 0)];
  assert.equal(nearestPoint(pts, 0, 0).id, 'b');
});

test('E: một hành động chạy ngay; nhiều hành động mở bảng chọn; không điểm -> false', () => {
  let t = 0; const ix = makeInteractor({ now: () => (t += 1000) });
  let ran = 0, chose = null;
  assert.equal(ix.press(P('a', 0, 0, 30, [{ id: 'x', run: () => ran++ }]), () => {}), true);
  assert.equal(ran, 1);
  const two = P('b', 0, 0, 30, [{ id: 'x', run() {} }, { id: 'y', run() {} }]);
  ix.press(two, (pt, acts) => { chose = acts.map(a => a.id); });
  assert.deepEqual(chose, ['x', 'y']);
  assert.equal(ix.press(null, () => {}), false);
});

test('bấm E dồn trong 250 ms chỉ chạy một lần', () => {
  let t = 0; const ix = makeInteractor({ now: () => t });
  let ran = 0; const pt = P('a', 0, 0, 30, [{ id: 'x', run: () => ran++ }]);
  ix.press(pt); t = 100; ix.press(pt); t = 200; ix.press(pt);
  assert.equal(ran, 1);
  t = 400; ix.press(pt);
  assert.equal(ran, 2);
});
