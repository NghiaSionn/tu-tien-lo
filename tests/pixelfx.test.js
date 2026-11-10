import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { toBeanfxMeta } from '../src/render/pixelfx.js';
import { fromJson, createFx } from '../lib/beanfx.js';

const NAMES = ['portal'];

test('sheet pixelfx đã nhập đủ, có giấy phép, khớp kích thước', () => {
  assert.ok(existsSync('fx/pixelfx/LICENSE') && existsSync('fx/pixelfx/NOTICE.md'));
  for (const n of NAMES) {
    const j = JSON.parse(readFileSync(`fx/pixelfx/${n}.json`, 'utf8'));
    const px = j.meta.pixelfx;
    assert.ok(existsSync(`fx/pixelfx/${j.meta.image}`), n + ': thiếu ảnh');
    assert.equal(j.frames.length, px.frames, n);
    for (const f of j.frames) {
      assert.deepEqual([f.frame.w, f.frame.h], px.frameSize, n);
      assert.ok(f.frame.x + f.frame.w <= j.meta.size.w && f.frame.y + f.frame.h <= j.meta.size.h, n + ': khung ra ngoài ảnh');
    }
  }
});

test('chuyển meta.pixelfx sang meta.beanfx: trình phát beanfx lặp đúng', () => {
  const j = JSON.parse(readFileSync('fx/pixelfx/portal.json', 'utf8'));
  j.meta.beanfx = toBeanfxMeta(j.meta.pixelfx);
  const asset = fromJson(j, { sheet: [{}] });
  const fx = createFx(asset);
  for (let i = 0; i < 300; i++) fx.update(1 / 60);
  assert.equal(fx.done, false, 'hiệu ứng lặp không được tự kết thúc');
  assert.ok(fx.frame >= 0 && fx.frame < j.meta.pixelfx.frames);
  assert.deepEqual(asset.meta.pivot, j.meta.pixelfx.pivot);
});
