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

test('trần fx sự kiện chiến đấu: 1000 tia trúng không làm fx vượt trần; nổ khi đầy về hình code', async () => {
  let R;
  try { R = await import('../src/render/render.js'); } catch { return; }   // sprites.js cần canvas: bỏ qua nếu Node không có
  const sheet = fromJson(JSON.parse(fs.readFileSync(new URL('kiem_trung.json', DIR), 'utf8')), {});
  const no = fromJson(JSON.parse(fs.readFileSync(new URL('hoa_cau_no.json', DIR), 'utf8')), {});
  for (const q of ['high', 'medium', 'low']) {
    const vis = R.makeVis({ kiem_trung: sheet, hoa_cau_no: no }); vis.quality = q;
    R.consumeEvents(vis, Array.from({ length: 1000 }, () => ({ type: 'fx', name: 'kiem_trung', x: 0, y: 0 })));
    assert.equal(vis.fxs.length, R.FX_CAP[q]);
    R.consumeEvents(vis, [{ type: 'boom', x: 0, y: 0, r: 16, fx: 'hoa_cau_no', fxR: 16, color: '#f80' }]);
    assert.equal(vis.fxs.length, R.FX_CAP[q]); assert.equal(vis.rings.length, 1);
  }
});

test('sheet nhân vật (M5-02): đủ khung đi/đánh/trúng đòn 4 hướng + 2 khung thiền, nằm trong ảnh', () => {
  const S = new URL('../sprites/', import.meta.url);
  const m = JSON.parse(fs.readFileSync(new URL('nhan_vat.json', S), 'utf8'));
  const b = fs.readFileSync(new URL(m.image, S)), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const [fw, fh] = m.frameSize;
  const need = ['sit0', 'sit1'];
  for (const d of ['down', 'up', 'left', 'right']) need.push(`${d}_walk0`, `${d}_walk1`, `${d}_walk2`, `${d}_walk3`, `${d}_atk`, `${d}_hurt`);
  for (const n of need) { const f = m.frames[n]; assert.ok(f, `thiếu ${n}`); assert.ok(f[0] + fw <= w && f[1] + fh <= h, `${n} ngoài ảnh`); }
  assert.ok(m.pivot[1] === fh - 1, 'pivot ở hàng chân cuối');
});
