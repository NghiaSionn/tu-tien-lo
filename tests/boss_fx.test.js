// (25/11) VFX chiêu pha 2: đủ sheet, khung PEAK rơi đúng lúc nổ, thiếu sheet / đồ họa Thấp thì trả về hình cũ, không đổi vùng trúng.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BOSS_FX_SHEETS, BOSS_FX_DEF, bossFxFrame, bossFxEvent, bossFxUpdate, bossFxObjs, bossFxClear } from '../src/render/boss_fx.js';
import { updateHazards } from '../src/entities/bosses.js';

const FX = {};
for (const n of BOSS_FX_SHEETS) { const j = JSON.parse(fs.readFileSync(new URL(`../fx/${n}.json`, import.meta.url))); FX[n] = { meta: j.meta.beanfx, frames: j.frames.map(f => f.frame), tags: {}, images: {} }; }

test('mọi sheet khai báo có trong fx/ và đủ số khung', () => {
  for (const [src, d] of Object.entries(BOSS_FX_DEF)) {
    assert.ok(FX[d.name], src); assert.ok(FX[d.name].meta.frames >= d.n, `${src}: ${FX[d.name].meta.frames} >= ${d.n}`); assert.ok(d.peak < d.n, src);
    if (d.also) assert.ok(FX[d.also], src);
    for (const ext of ['_color.png', '_light.png', '.png']) assert.ok(fs.existsSync(new URL(`../fx/${d.name}${ext}`, import.meta.url)), d.name + ext);
  }
});

test('khung: chưa tới thì -1, tăng dần tới PEAK đúng lúc nổ', () => {
  const d = BOSS_FX_DEF['boss:thunder'];
  assert.equal(bossFxFrame(d, 1, -1), -1);
  let last = -1;
  for (let left = 0.3; left > 0.0005; left -= 0.004) { const f = bossFxFrame(d, left, -1); assert.ok(f >= last && f < d.peak, `${left}: ${f}`); last = f; }
  assert.equal(last, d.peak - 1);
  assert.equal(bossFxFrame(d, 0, 0), d.peak);
  assert.equal(bossFxFrame(d, 0, 1 / 24), d.peak + 1);
});

test('vùng nổ phát sự kiện kèm bản chụp; có sheet thì VFX nhận, hết khung thì tự xóa', () => {
  const scene = { hazards: [{ x: 10, y: 20, r: 22, t: 0.01, max: 1, dmg: 1, src: 'boss:thunder' }, { ring: true, x: 0, y: 0, R: 76, r: 8, a0: 0, span: 5.4, t: 0.01, max: 1, dmg: 1, src: 'miniboss:quake' }], monsters: [] }, ev = [];
  updateHazards(scene, { x: 999, y: 999, dead: false }, 0.02, ev, () => {});
  assert.equal(ev.length, 2); assert.ok(ev.every(e => e.hz && (e.type === 'boom' || e.type === 'pulse')));
  assert.equal(bossFxEvent({ FX: {} }, ev[0]), false, 'thiếu sheet -> hình cũ');
  assert.equal(bossFxEvent({ FX, quality: 'low' }, ev[0]), false, 'đồ họa Thấp -> hình cũ');
  const vis = { FX };
  for (const e of ev) assert.equal(bossFxEvent(vis, e), true);
  bossFxUpdate(vis, 0.05);
  const objs = bossFxObjs(vis, { hazards: [], monsters: [] });
  assert.ok(objs.length > 15, 'cột sét + phiến đá dọc vành: ' + objs.length);
  assert.ok(objs.every(o => Number.isFinite(o.y) && typeof o.draw === 'function'));
  for (let i = 0; i < 40; i++) bossFxUpdate(vis, 0.05);
  assert.equal(vis.bossFx.length, 0);
  bossFxClear(vis);
});

test('phiến đá chừa đúng khe an toàn của Trấn Địa', () => {
  const h = { ring: true, x: 0, y: 0, R: 110, r: 8, a0: 0.425, span: Math.PI * 2 - 0.85, t: 0, src: 'miniboss:quake' }, vis = { FX };
  bossFxEvent(vis, { hz: h }); bossFxUpdate(vis, 0.1); bossFxObjs(vis, { hazards: [], monsters: [] });
  for (const [x, y] of h._cl) { const a = Math.atan2(y - 3, x); assert.ok(Math.abs(a) > 0.425 + 9 / 110, `phiến đá lấn vào khe (${a.toFixed(2)})`); }
});

// ---- (25/11) góp ý: sóng khí vuốt bay, gầm nhiều nhịp, lướt xa hơn ----
test('sóng khí vuốt: trúng đúng lúc đầu sóng lướt qua, mỗi sóng một lần, đứng ngoài dải không trúng', () => {
  const mk = () => ({ x: 135, y: 0, x0: 0, y0: 0, x1: 270, y1: 0, r: 13, t: 0.02, max: 1, dmg: 5, src: 'miniboss:cracks', travel: 0.3 });
  const run = (px, py) => {
    const scene = { hazards: [mk()] }, ev = [], hits = []; let t = 0;
    for (let i = 0; i < 30 && scene.hazards.length; i++) { t += 1 / 60; updateHazards(scene, { x: px, y: py, dead: false }, 1 / 60, ev, () => hits.push(t)); }
    assert.equal(scene.hazards.length, 0); assert.equal(ev.filter(e => e.hz).length, 1, 'một sự kiện phóng');
    return hits;
  };
  const a = run(40, 0), b = run(230, 5);
  assert.equal(a.length, 1); assert.equal(b.length, 1); assert.ok(b[0] - a[0] > 0.15, 'đứng xa trúng sau');
  assert.equal(run(120, 14).length, 0); assert.equal(run(-20, 0).length, 0); assert.equal(run(290, 0).length, 0);
});

test('tầm chiêu pha 2 rộng hơn bản cũ; Tam Xung lướt ít nhất gấp 1,8 lần lao thường', async () => {
  const { BOSS, BOSS_V2 } = await import('../src/core/config.js');
  const { dashOf, clawOf } = await import('../src/systems/tactics.js');
  const V = BOSS_V2.MINI, D = V.BLOOD_DASH, L = m => dashOf(m).SPEED * dashOf(m).TIME;
  assert.ok(L({ dashS: D.SPEED, dashTm: D.TIME }) >= 1.8 * L({})); assert.equal(L({}), BOSS.MINI.DASH.SPEED * BOSS.MINI.DASH.TIME, 'lao thường giữ nguyên');
  assert.equal(clawOf({}).R, V.CLAW.R); assert.equal(clawOf({ clawR: V.COMBO.CR }).R, 100);
});
