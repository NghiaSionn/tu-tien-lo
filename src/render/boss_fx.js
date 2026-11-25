// (25/11) VFX beanfx cho 13 chiêu pha 2 của hai boss (draft: drafts/boss_p2_chieu, concept ChatGPT).
// Chỉ là hình: không đụng vùng trúng / thời gian. Khung PEAK của mỗi sheet rơi đúng lúc vùng nổ;
// các khung trước PEAK chạy trong nhịp cuối của cảnh báo (h.t < PEAK / 24).
// Lớp: bossFxGround (mặt đất: cây, boss, người chơi đè lên) và bossFxObjs (dựng đứng: xếp theo chân như mọi vật).
// Đồ họa Thấp hoặc thiếu sheet: trả về false / rỗng -> hình code cũ.
import { createFx } from '../../lib/beanfx.js';
import { BOSS_V2 } from '../core/config.js';
import { dashOf } from '../systems/tactics.js';

export const BOSS_FX_SHEETS = ['lv_dia_chan', 'lv_khi_trao', 'lv_vet_cat', 'lv_dau_vuot', 'lv_trao', 'lv_can', 'lv_ho_khi_tron',
  'yv_loi_phat', 'yv_sam_bat', 'yv_sam_xich', 'yv_sam_vong', 'yv_nut_an', 'yv_ma_cung', 'yv_phan_anh', 'yv_ma_quang'];
const FPS = 24, TILE = 64, CLUMP_N = 14, VET_L = 158, MAX_LIVE = 60, STOMP_K = 0.75;
// src của vùng -> { name: sheet, peak: khung đúng lúc nổ, n: số khung }
export const BOSS_FX_DEF = {
  'miniboss:quake': { name: 'lv_dia_chan', peak: 3, n: CLUMP_N },
  'miniboss:cracks': { name: 'lv_vet_cat', peak: 0, n: 14, also: 'lv_khi_trao' },
  'miniboss:bite': { name: 'lv_can', peak: 4, n: 15 },
  'miniboss:leap': { name: 'lv_dau_vuot', peak: 4, n: 17 },
  'miniboss:rageHowl': { name: 'lv_ho_khi_tron', peak: 0, n: 1 },
  'boss:thunder': { name: 'yv_loi_phat', peak: 4, n: 16 },
  'boss:eight': { name: 'yv_sam_bat', peak: 2, n: 12 },
  'boss:chainBolt': { name: 'yv_sam_xich', peak: 2, n: 12, also: 'yv_nut_an' },
  'boss:net': { name: 'yv_sam_vong', peak: 2, n: 12 },
  'boss:runes': { name: 'yv_ma_cung', peak: 4, n: 16 },
};
const CACHE = {};
function get(vis, name) {
  const a = vis.FX && vis.FX[name];
  if (!a || vis.quality === 'low') return null;
  return CACHE[name] || (CACHE[name] = createFx(a));
}
const has = (vis, d) => !!get(vis, d.name) && (!d.also || !!get(vis, d.also));
const h01 = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

function cell(ctx, vis, name, f, x, y, o = {}) {
  const fx = get(vis, name); if (!fx || f < 0 || f >= vis.FX[name].meta.frames) return;
  fx.frame = f; fx.x = Math.round(x); fx.y = Math.round(y); fx.scale = o.scale || 1; fx.flip = !!o.flip; fx.lightGain = o.light ?? 1; fx.draw(ctx);
}
// vẽ xoay quanh (x, y) theo góc a (điểm ảnh sắc nét); sx/sy: co giãn / lật
function turned(ctx, vis, name, f, x, y, a, sx = 1, sy = 1, light = 1) {
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); ctx.scale(sx, sy);
  cell(ctx, vis, name, f, 0, 0, { light }); ctx.restore();
}
// dải sét dài bất kỳ: lát đoạn TILE px, đoạn cuối cắt theo bề dài (cắt ảnh nguồn, không dùng clip cho nhẹ)
function strip(ctx, vis, name, f, h) {
  const A = vis.FX[name], im = A.images, r = A.frames[f]; if (!r || f < 0 || !im.color) return;
  const dx = h.x1 - h.x0, dy = h.y1 - h.y0, L = Math.hypot(dx, dy) || 1, [px, py] = A.meta.pivot, n = Math.ceil(L / TILE);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(h.x0), Math.round(h.y0)); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(1, h.r / 8);
  for (const img of [im.color[r.page], im.light[r.page]]) {
    if (img === im.light[r.page]) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; }
    for (let k = 0; k < n; k++) { const w = Math.min(TILE, L - k * TILE); if (w >= 1) ctx.drawImage(img, r.x + px, r.y, w, r.h, k * TILE, -py, w, r.h); }
  }
  ctx.restore();
}
// các cụm phiến đá dọc vành: [x, y, biến thể, lật, trễ khung]
function clumps(h) {
  if (h._cl) return h._cl;
  const out = [];
  if (h.ring) {
    const full = h.span >= 6.28, pad = full ? 0 : 11 / h.R, span = h.span - pad * 2, n = Math.max(2, Math.round(span * h.R / 18));
    for (let i = 0; i < n + (full ? 0 : 1); i++) { const a = h.a0 + pad + span * i / n, s = h01(i * 3.7 + h.R); const R = h.R + (i % 2 ? 4 : -4); out.push([h.x + Math.cos(a) * R, h.y + Math.sin(a) * R + 3, Math.floor(s * 3) % 3, h01(i + h.R) < 0.5, s < 0.5 ? 0 : 1]); }
  }
  return (h._cl = out);
}

// khung của vùng: đang chờ nổ (t còn lại) hoặc đã nổ (age giây); -1 = chưa tới
export const bossFxFrame = (d, left, age) => (age >= 0 ? d.peak + Math.floor(age * FPS + 1e-6) : left < d.peak / FPS ? d.peak - Math.max(1, Math.ceil(left * FPS - 1e-6)) : -1);

function ground(ctx, vis, h, d, f) {
  switch (h.src) {
    case 'miniboss:leap': cell(ctx, vis, d.name, f, h.x, h.y); break;
    case 'boss:thunder': if (f < d.peak) cell(ctx, vis, d.name, f, h.x, h.y); break;
    case 'boss:eight': strip(ctx, vis, d.name, f, h); break;
    case 'boss:chainBolt': strip(ctx, vis, d.name, f, h); break;
    case 'boss:net': strip(ctx, vis, d.name, f, h); break;
    case 'boss:runes': turned(ctx, vis, d.name, f, h.x, h.y, h.a0 + h.span / 2, 1, h.spin < 0 ? -1 : 1); break;
  }
}
function upright(vis, h, d, left, age, out) {
  const f = bossFxFrame(d, left, age);
  if (h.src === 'miniboss:quake') {
    const name = d.name; if (!h.ring) return;   // vùng dậm dưới chân boss: lv_pha_dia vẽ
    for (const [x, y, v, flip, late] of clumps(h)) { const k = f - late; if (k >= 0 && k < CLUMP_N) out.push({ y, draw: ctx => cell(ctx, vis, name, v * CLUMP_N + k, x, y, { flip, light: 0.8 }) }); }
  } else if (f >= 0 && f < d.n && (h.src === 'miniboss:bite' || (h.src === 'boss:thunder' && f >= d.peak))) out.push({ y: h.y + (h.src === 'miniboss:bite' ? 18 : 4), draw: ctx => cell(ctx, vis, d.name, f, h.x, h.y) });
}

// sự kiện nổ: giữ lại bản chụp vùng để chạy nốt khung; true = đã lo phần nhìn (bỏ vòng nổ cũ)
export function bossFxEvent(vis, e) {
  const h = e.hz, d = h && BOSS_FX_DEF[h.src];
  if (!d || !has(vis, d)) return false;
  const L = vis.bossFx || (vis.bossFx = []);
  if (L.length >= MAX_LIVE) L.shift();
  L.push({ h, d, age: 0, life: h.travel ? h.travel + 14 / FPS : 0 });
  return true;
}
// hiệu ứng rời: vết cào ('claw'), dậm đất ('stomp'), bóng rã ('cloneOut')
export function bossFxSpawn(vis, e) {
  const L = vis.bossFx || (vis.bossFx = []);
  if (e.fx === 'claw' && get(vis, 'lv_trao')) L.push({ claw: e, age: 0, life: 12 / FPS });
  else if (e.fx === 'stomp' && get(vis, 'lv_pha_dia')) L.push({ stomp: e, age: 0, life: 31 / FPS });
  else if (e.fx === 'cloneOut' && get(vis, 'yv_phan_anh')) L.push({ out: e, age: 0, life: 12 / FPS });
}
export function bossFxUpdate(vis, dt) {
  const L = vis.bossFx; if (!L) return;
  for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.age += dt; if (q.age > (q.life || (q.d.n - q.d.peak + 4) / FPS)) L.splice(i, 1); }
}
export function bossFxClear(vis) { if (vis.bossFx) vis.bossFx.length = 0; }

export function bossFxGround(ctx, vis, scene, time) {
  ctx.globalAlpha = 1;
  for (const h of scene.hazards || []) { const d = BOSS_FX_DEF[h.src]; if (!d || !has(vis, d) || h.travel) continue; const f = bossFxFrame(d, h.t, -1); if (f >= 0) ground(ctx, vis, h, d, f); }
  const nodes = new Set();
  for (const q of vis.bossFx || []) {
    if (q.d) {
      const f = bossFxFrame(q.d, 0, q.age);
      if (q.h.travel) { slashTrail(ctx, vis, q); continue; }
      ground(ctx, vis, q.h, q.d, f);
      if (q.h.src === 'boss:chainBolt') for (const [x, y] of [[q.h.x0, q.h.y0], [q.h.x1, q.h.y1]]) {   // nút ma ấn ở điểm gấp (mỗi điểm một lần)
        const k = Math.round(x) + ',' + Math.round(y); if (!nodes.has(k)) { nodes.add(k); cell(ctx, vis, 'yv_nut_an', f, x, y, { light: 0.8 }); }
      }
    } else if (q.claw) { const k = (q.claw.r || 100) / 100; turned(ctx, vis, 'lv_trao', 1 + Math.floor(q.age * FPS), q.claw.x, q.claw.y, q.claw.a, k, q.claw.flip ? -k : k); }
    else if (q.stomp) cell(ctx, vis, 'lv_pha_dia', 4 + Math.floor(q.age * FPS), q.stomp.x, q.stomp.y, { scale: STOMP_K });
  }
  for (const m of scene.monsters) {
    dashTrail(ctx, vis, m, time); roar(ctx, vis, m, time);
    if (!m.dead && m.boss && m.st === 'windup' && m.pat === 'quake' && m.stT < 4 / FPS) cell(ctx, vis, 'lv_pha_dia', 4 - Math.max(1, Math.ceil(m.stT * FPS)), m.x, m.y, { scale: STOMP_K });   // đất rạn ngay trước cú dậm
  }
}
// Huyết Trảo Phá Địa: vết cắt lộ dần theo đầu sóng, rồi nguội và tan
function slashTrail(ctx, vis, q) {
  const h = q.h, A = vis.FX.lv_vet_cat, im = A.images; if (!im.color) return;
  const dx = h.x1 - h.x0, dy = h.y1 - h.y0, L = Math.hypot(dx, dy) || 1, u = Math.min(1, q.age / h.travel), f = u < 1 ? 1 : 1 + Math.floor((q.age - h.travel) * FPS), r = A.frames[f]; if (!r) return;
  const [px, py] = A.meta.pivot, w = Math.max(1, Math.round((r.w - px) * u));
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(h.x0), Math.round(h.y0)); ctx.rotate(Math.atan2(dy, dx)); ctx.scale(L / VET_L, 1);
  ctx.drawImage(im.color[r.page], r.x + px, r.y, w, r.h, 0, -py, w, r.h);
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(im.light[r.page], r.x + px, r.y, w, r.h, 0, -py, w, r.h); ctx.restore();
}
// Cuồng Lang Bạo Khiếu: sóng gầm (bản tròn của lv_ho_khi trong cảnh biến hình) bung liên tục suốt các nhịp; bắt đầu 0,25 s trước nhịp đầu
const ROAR_LEAD = 0.25;
const roarT = m => (!m.dead && m.boss && m.st === 'windup' && m.pat === 'rageHowl' && m.howlT ? m.stMax - m.stT - m.howlT + ROAR_LEAD : -1);
export const bossRoars = scene => scene.monsters.filter(m => roarT(m) >= 0).map(m => ({ x: m.x, y: m.y, f: roarT(m) * FPS, end: 1e9 }));
function roar(ctx, vis, m, time) {
  if (!m.boss || !get(vis, 'lv_ho_khi_tron')) return;
  const t = roarT(m); if (t >= 0) { m._roarAt = time; m._roarT = t; }
  const out = t >= 0 ? 0 : (time - (m._roarAt ?? -9)) / 0.3; if (m._roarAt === undefined || out >= 1) return;
  const tt = m._roarT + (t >= 0 ? 0 : time - m._roarAt), f = Math.floor(tt * FPS) % 12;
  ctx.save();
  if (tt < 9 / FPS) { ctx.beginPath(); ctx.arc(m.x, m.y, 8 + 112 * (1 - (1 - tt * FPS / 9) ** 2.2), 0, 6.283); ctx.clip(); }   // đợt đầu mới bung: chưa có sóng ở xa
  if (out > 0) { ctx.beginPath(); ctx.arc(m.x, m.y, 130, 0, 6.283); ctx.arc(m.x, m.y, 110 * out, 0, 6.283, true); ctx.clip(); ctx.globalAlpha = 1 - out; }   // dứt tiếng: sóng trôi ra rồi tan
  cell(ctx, vis, 'lv_ho_khi_tron', f, m.x, m.y, { light: 0.8 * (1 - out) }); ctx.restore();
}
// Huyết Ảnh Tam Xung: vệt máu kéo theo sói đang lao (pha 2), dừng lao thì tan 8 khung
function dashTrail(ctx, vis, m, time) {
  if (!m.boss || m.bossKind !== 'MINI' || !m.p2 || m.dead || m.ult) return;
  if (m.st === 'dash') { if (!m._tr || m._tr.end !== undefined) m._tr = { x: m.x, y: m.y, a: Math.atan2(m.dirY, m.dirX) }; m._tr.far = Math.hypot(m.x - m._tr.x, m.y - m._tr.y); }
  else if (m._tr && m._tr.end === undefined) m._tr.end = time;
  const tr = m._tr, fx = tr && get(vis, 'lv_huyet_anh'); if (!fx || tr.far < 14) return;
  const f = tr.end === undefined ? 5 : 6 + Math.floor((time - tr.end) * FPS);
  if (f >= vis.FX.lv_huyet_anh.meta.frames) return;
  const L = dashOf(m).SPEED * dashOf(m).TIME;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(tr.x), Math.round(tr.y) - 16); ctx.rotate(tr.a); ctx.scale(L / 244, 1.8);
  ctx.beginPath(); ctx.rect(-8, -30, Math.max(0, tr.far - (tr.end === undefined ? 10 : 0)) * 244 / L, 60); ctx.clip();
  fx.frame = f; fx.x = 0; fx.y = 0; fx.scale = 1; fx.flip = false; fx.lightGain = 0.35; fx.draw(ctx); ctx.restore();
}
export function bossFxObjs(vis, scene) {
  const out = [];
  for (const h of scene.hazards || []) { const d = BOSS_FX_DEF[h.src]; if (d && has(vis, d) && !h.travel) upright(vis, h, d, h.t, -1, out); }
  for (const q of vis.bossFx || []) {
    if (q.d && q.h.travel) {   // sóng khí vuốt đang bay
      const h = q.h, u = q.age / h.travel; if (u > 1.08) continue;
      const x = h.x0 + (h.x1 - h.x0) * Math.min(1, u), y = h.y0 + (h.y1 - h.y0) * Math.min(1, u), a = Math.atan2(h.y1 - h.y0, h.x1 - h.x0);
      out.push({ y: y + 6, draw: ctx => turned(ctx, vis, 'lv_khi_trao', Math.floor(q.age * FPS * 1.5) % 6, x, y, a, 1, 1, 0.9) });
    } else if (q.d) upright(vis, q.h, q.d, 0, q.age, out);
    else if (q.out) { const { x, y } = q.out, f = 10 + Math.floor(q.age * FPS); out.push({ y: y + 1, draw: ctx => cell(ctx, vis, 'yv_phan_anh', f, x, y) }); }
  }
  for (const m of scene.monsters) if (m.clones && !m.dead && m.st === 'windup' && get(vis, 'yv_phan_anh')) {   // khói tụ thành bóng rồi tan lộ phân thân
    const t = m.stMax - m.stT, f = t < 10 / FPS ? Math.floor(t * FPS) : 10 + Math.floor((t - 10 / FPS) * FPS);
    if (f < 22) for (const c of m.clones) out.push({ y: c.y + 2, draw: ctx => cell(ctx, vis, 'yv_phan_anh', f, c.x, c.y) });
  }
  return out;
}
export const bossFxCloneT = (vis, m) => (get(vis, 'yv_phan_anh') ? Math.max(0, Math.min(1, (m.stMax - m.stT - 9 / FPS) / 0.1)) : 1);   // thân bóng hiện khi khói đã dày
// Diệt Thế Ma Quang: lưỡi quang + 3 tàn ảnh phía sau. true = đã vẽ
export function bossFxBeam(ctx, vis, m, time) {
  if (!vis || !get(vis, 'yv_ma_quang')) return false;
  const S = BOSS_V2.FINAL.SWEEP, a = m.swA0 + m.swDir * S.ARC * (m.swK || 0), f = Math.floor(time * FPS) % 8;
  for (let k = 3; k >= 1; k--) {
    const b = a - m.swDir * 0.075 * k; if ((b - m.swA0) * m.swDir < 0) continue;
    ctx.globalAlpha = 0.34 - 0.09 * k; turned(ctx, vis, 'yv_ma_quang', (f + k * 3) % 8, m.x, m.y - 10, b, S.L / 180, 1, 0.1);
  }
  ctx.globalAlpha = 1; turned(ctx, vis, 'yv_ma_quang', f, m.x, m.y - 10, a, S.L / 180, 1, 1);
  return true;
}
