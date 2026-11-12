// M5-03: mọi sheet VFX trong fx/ đọc được bằng lib/beanfx.js, đủ file màu/sáng, kích thước ảnh khớp lưới khung
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fromJson, createFx } from '../lib/beanfx.js';

const DIR = new URL('../fx/', import.meta.url);
const pngSize = file => { const b = fs.readFileSync(new URL(file, DIR)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const NEW = ['loi_cuong_back', 'loi_cuong_front', 'loi_vuc', 'hoa_cau_bay', 'hoa_cau_no', 'phong_nhan', 'hoa_long_quyen_v2',
  'phi_kiem', 'liet_diem_kiem', 'liet_diem_vung', 'bang_cham', 'han_khi', 'hoa_luan', 'hac_diem_no', 'hac_diem_dan'];

for (const name of NEW) {
  test(`sheet ${name}: JSON + ảnh màu/sáng hợp lệ`, () => {
    const json = JSON.parse(fs.readFileSync(new URL(`${name}.json`, DIR), 'utf8'));
    const a = fromJson(json, {});
    const m = a.meta, [fw, fh] = m.frameSize;
    assert.equal(a.frames.length, m.frames * (m.rows || 1), 'số khung = frames × rows');
    for (const key of ['sheet', 'color', 'light']) {
      assert.ok(m[key] && fs.existsSync(new URL(m[key], DIR)), `thiếu ${key}`);
      const { w, h } = pngSize(m[key]);
      for (const f of a.frames) assert.ok(f.x + f.w <= w && f.y + f.h <= h, `${key}: khung ngoài ảnh`);
    }
    assert.ok(m.fps > 0 && fw > 0 && fh > 0 && m.pivot.length === 2);
    // phát được: chạy hết một vòng không lỗi
    const fx = createFx(a, { heading: 1.0 });
    for (let i = 0; i < m.frames + 2; i++) fx.update(1 / m.fps);
    assert.ok(m.loop || fx.done || fx.frame >= 0);
  });
}

test('sheet bay nhiều hướng chọn đúng hàng theo hướng bay', async () => {
  const { rowOf } = await import('../lib/beanfx.js');
  assert.equal(rowOf(0, 8), 0); assert.equal(rowOf(Math.PI / 2, 8), 2); assert.equal(rowOf(Math.PI, 8), 4); assert.equal(rowOf(-Math.PI / 2, 8), 6);
});
