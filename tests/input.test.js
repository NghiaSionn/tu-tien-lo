// M7-02: phím tắt UI trùng với phím di chuyển/đánh (Space, J, D) phải tới được onAction.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.addEventListener ??= () => {};
const { makeInput } = await import('../src/core/input.js');

const ev = (code, extra = {}) => ({ code, repeat: false, target: null, preventDefault() { this.prevented = true; }, ...extra });

test('phím tắt UI được onAction nhận thì không thành di chuyển/đánh', () => {
  const seen = [];
  const inp = makeInput(code => { seen.push(code); return code === 'KeyJ' || code === 'Space'; });
  const e = ev('KeyJ');
  inp.onKeyDown(e);
  inp.onKeyDown(ev('Space'));
  assert.deepEqual(seen, ['KeyJ', 'Space']);
  assert.equal(inp.keys.attack, undefined);
  assert.equal(e.prevented, true);
});

test('onAction không nhận thì phím vẫn là di chuyển/đánh như cũ', () => {
  const inp = makeInput(() => false);
  inp.onKeyDown(ev('Space'));
  inp.onKeyDown(ev('KeyD'));
  assert.equal(inp.keys.attack, true);
  assert.equal(inp.keys.right, true);
});

test('giữ phím (repeat) không gọi lại onAction', () => {
  let n = 0;
  const inp = makeInput(() => { n++; return true; });
  inp.onKeyDown(ev('Space'));
  inp.onKeyDown(ev('Space', { repeat: true }));
  inp.onKeyDown(ev('Space', { repeat: true }));
  assert.equal(n, 1);
});
