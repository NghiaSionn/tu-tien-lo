// (25/11) VFX beanfx cho 13 chiêu pha 2 của hai boss (draft: drafts/boss_p2_chieu, concept ChatGPT).
// Chỉ là hình: không đụng vùng trúng / thời gian. Khung PEAK của mỗi sheet rơi đúng lúc vùng nổ;
// các khung trước PEAK chạy trong nhịp cuối của cảnh báo (h.t < PEAK / 24).
// Lớp: bossFxGround (mặt đất: cây, boss, người chơi đè lên) và bossFxObjs (dựng đứng: xếp theo chân như mọi vật).
// Đồ họa Thấp hoặc thiếu sheet: trả về false / rỗng -> hình code cũ.
import { createFx } from '../../lib/beanfx.js';
import { BOSS_V2 } from '../core/config.js';
import { dashOf } from '../systems/tactics.js';

export const BOSS_FX_SHEETS = ['lv_dia_chan', 'lv_huyet_gai', 'lv_vet_nut', 'lv_dau_vuot', 'lv_trao', 'lv_can', 'lv_ho_khi_tron',
  'yv_loi_phat', 'yv_sam_bat', 'yv_sam_xich', 'yv_sam_vong', 'yv_nut_an', 'yv_ma_cung', 'yv_phan_anh', 'yv_ma_quang',
  // (26/11) Đợt C: pha 1 + Thập Tự
  'lv_trao_1', 'lv_gio_lao', 'lv_ho_khi_1', 'yv_dan_no', 'yv_hac_diem', 'yv_chan_dia', 'yv_trieu', 'yv_hac_liet', 'lv_trieu_soi'];
const FPS = 24, TILE = 64, CLUMP_N = 14, VET_L = 254, MAX_LIVE = 60, STOMP_K = 0.75;
// src của vùng -> { name: sheet, peak: khung đúng lúc nổ, n: số khung }
export const BOSS_FX_DEF = {
  'miniboss:quake': { name: 'lv_dia_chan', peak: 3, n: CLUMP_N },
  'miniboss:cracks': { name: 'lv_vet_nut', peak: 2, n: 14, also: 'lv_huyet_gai' },
  'miniboss:bite': { name: 'lv_can', peak: 4, n: 15 },
  'miniboss:leap': { name: 'lv_dau_vuot', peak: 4, n: 17 },
  'miniboss:rageHowl': { name: 'lv_ho_khi_tron', peak: 0, n: 1 },
  'boss:thunder': { name: 'yv_loi_phat', peak: 4, n: 16 },
  'boss:eight': { name: 'yv_sam_bat', peak: 2, n: 12 },
  'boss:chainBolt': { name: 'yv_sam_xich', peak: 2, n: 12, also: 'yv_nut_an' },
  'boss:net': { name: 'yv_sam_vong', peak: 2, n: 12 },
  'boss:runes': { name: 'yv_ma_cung', peak: 4, n: 16 },
  'boss:zone': { name: 'yv_hac_diem', peak: 4, n: 18 },
  'boss:slam': { name: 'yv_chan_dia', peak: 2, n: 19 },
  'boss:prison': { name: 'yv_ma_trao', peak: 4, n: 15 },
  'boss:cross': { name: 'yv_hac_liet', peak: 2, n: 14 },
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
// các cụm phiến đá dọc vành / gai dọc vệt: [x, y, biến thể, lật, trễ khung]
function clumps(h) {
  if (h._cl) return h._cl;
  const out = [];
  if (h.ring) {
    const full = h.span >= 6.28, pad = full ? 0 : 11 / h.R, span = h.span - pad * 2, n = Math.max(2, Math.round(span * h.R / 18));
    for (let i = 0; i < n + (full ? 0 : 1); i++) { const a = h.a0 + pad + span * i / n, s = h01(i * 3.7 + h.R); const R = h.R + (i % 2 ? 4 : -4); out.push([h.x + Math.cos(a) * R, h.y + Math.sin(a) * R + 3, Math.floor(s * 3) % 3, h01(i + h.R) < 0.5, s < 0.5 ? 0 : 1]); }
  } else if (h.x0 !== undefined) {
    const dx = h.x1 - h.x0, dy = h.y1 - h.y0, L = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.round(L / 14));
    for (let i = 1; i <= n; i++) { const s = h01(i * 5.3 + h.x1), u = (i - 0.4) / n; out.push([h.x0 + dx * u, h.y0 + dy * u + 3, Math.floor(s * 3) % 3, h01(i + h.y1) < 0.5, Math.floor(i / n * 3)]); }
  }
  return (h._cl = out);
}

// khung của vùng: đang chờ nổ (t còn lại) hoặc đã nổ (age giây); -1 = chưa tới
export const bossFxFrame = (d, left, age) => (age >= 0 ? d.peak + Math.floor(age * FPS + 1e-6) : left < d.peak / FPS ? d.peak - Math.max(1, Math.ceil(left * FPS - 1e-6)) : -1);

function ground(ctx, vis, h, d, f) {
  switch (h.src) {
    case 'miniboss:cracks': { const L = Math.hypot(h.x1 - h.x0, h.y1 - h.y0) || 1; if (f < d.n) turned(ctx, vis, d.name, f, h.x0, h.y0, Math.atan2(h.y1 - h.y0, h.x1 - h.x0), L / VET_L); break; }
    case 'boss:slam': cell(ctx, vis, d.name, f, h.x, h.y); break;
    case 'boss:zone': if (f < d.peak) cell(ctx, vis, d.name, f, h.x, h.y); break;
    case 'boss:cross': { const a = Math.atan2(h.y1 - h.y0, h.x1 - h.x0), k = Math.hypot(h.x1 - h.x0, h.y1 - h.y0) / 2 / 134; if (f < d.n) for (const q of [a, a + Math.PI]) turned(ctx, vis, d.name, f, h.x, h.y, q, k, 1, 0.7); break; }
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
  if (h.src === 'miniboss:quake' || h.src === 'miniboss:cracks') {
    const name = d.also || d.name; if (!h.ring && h.x0 === undefined) return;   // vùng dậm dưới chân boss: lv_pha_dia vẽ
    for (const [x, y, v, flip, late] of clumps(h)) { const k = f - late; if (k >= 0 && k < CLUMP_N) out.push({ y, draw: ctx => cell(ctx, vis, name, v * CLUMP_N + k, x, y, { flip, light: 0.8 }) }); }
  } else if (f >= 0 && f < d.n && h.src === 'boss:prison') out.push({ y: h.y + 4, draw: ctx => cell(ctx, vis, d.name, f, h.x, h.y, { scale: 1.25 }) });
  else if (f >= 0 && f < d.n && (h.src === 'miniboss:bite' || (h.src === 'boss:zone' && f >= d.peak) || (h.src === 'boss:thunder' && f >= d.peak))) out.push({ y: h.y + (h.src === 'miniboss:bite' ? 18 : 4), draw: ctx => cell(ctx, vis, d.name, f, h.x, h.y) });
}

// sự kiện nổ: giữ lại bản chụp vùng để chạy nốt khung; true = đã lo phần nhìn (bỏ vòng nổ cũ)
export function bossFxEvent(vis, e) {
  const h = e.hz, d = h && BOSS_FX_DEF[h.src];
  if (!d || !has(vis, d)) return false;
  const L = vis.bossFx || (vis.bossFx = []);
  if (L.length >= MAX_LIVE) L.shift();
  L.push({ h, d, age: 0 });
  return true;
}
// hiệu ứng rời: vết cào ('claw'), dậm đất ('stomp'), bóng rã ('cloneOut')
export function bossFxSpawn(vis, e) {
  const L = vis.bossFx || (vis.bossFx = []);
  if (e.fx === 'burst' && get(vis, 'yv_dan_no')) L.push({ burst: e, age: 0, life: 10 / FPS });
  else if (e.fx === 'trieuSoi' && get(vis, 'lv_trieu_soi')) L.push({ soi: e, age: 0, life: 22 / FPS });
  else if (e.fx === 'trieu' && get(vis, 'yv_trieu')) L.push({ out: e, small: true, age: 0, life: 12 / FPS });
  else if (e.fx === 'claw' && get(vis, 'lv_trao')) L.push({ claw: e, age: 0, life: 12 / FPS });
  else if (e.fx === 'stomp' && get(vis, 'lv_pha_dia')) L.push({ stomp: e, age: 0, life: 31 / FPS });
  else if (e.fx === 'cloneOut' && get(vis, 'yv_phan_anh')) L.push({ out: e, age: 0, life: 12 / FPS });
}
export function bossFxUpdate(vis, dt) {
  const L = vis.bossFx; if (!L) return;
  for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.age += dt; if (q.age > (q.life || (q.d.n - q.d.peak + 4) / FPS)) L.splice(i, 1); }
}
export function howlFrame(ctx, vis, t, x, y) {   // cutscene vách đá: cùng tiếng hú (tọa độ màn hình)
  if (!get(vis, 'lv_ho_khi_1')) return false;
  const r = 16 + 324 * (1 - (1 - Math.min(1, t * FPS / 12)) ** 2.2);
  ctx.save(); if (t * FPS < 12) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, 6.283); ctx.clip(); }
  ctx.globalAlpha = 0.85; cell(ctx, vis, 'lv_ho_khi_1', Math.floor(t * FPS) % 12, x, y, { scale: 2, light: 0.55 }); ctx.restore(); return true;
}
export function bossFxClear(vis) { if (vis.bossFx) vis.bossFx.length = 0; }

export function bossFxGround(ctx, vis, scene, time) {
  ctx.globalAlpha = 1;
  for (const h of scene.hazards || []) { const d = BOSS_FX_DEF[h.src]; if (!d || !has(vis, d)) continue; const f = bossFxFrame(d, h.t, -1); if (f >= 0) ground(ctx, vis, h, d, f); }
  const nodes = new Set();
  for (const q of vis.bossFx || []) {
    if (q.d) {
      const f = bossFxFrame(q.d, 0, q.age);
      ground(ctx, vis, q.h, q.d, f);
      if (q.h.src === 'boss:chainBolt') for (const [x, y] of [[q.h.x0, q.h.y0], [q.h.x1, q.h.y1]]) {   // nút ma ấn ở điểm gấp (mỗi điểm một lần)
        const k = Math.round(x) + ',' + Math.round(y); if (!nodes.has(k)) { nodes.add(k); cell(ctx, vis, 'yv_nut_an', f, x, y, { light: 0.8 }); }
      }
    } else if (q.claw) { const p1 = !q.claw.p2 && get(vis, 'lv_trao_1'), k = (q.claw.r || 100) / (p1 ? 72 : 100); turned(ctx, vis, p1 ? 'lv_trao_1' : 'lv_trao', 1 + Math.floor(q.age * FPS), q.claw.x, q.claw.y, q.claw.a, k, q.claw.flip ? -k : k); }
    else if (q.burst) cell(ctx, vis, 'yv_dan_no', 5 + Math.floor(q.age * FPS), q.burst.x, q.burst.y - 10);
    else if (q.stomp) cell(ctx, vis, 'lv_pha_dia', 4 + Math.floor(q.age * FPS), q.stomp.x, q.stomp.y, { scale: STOMP_K });
  }
  for (const m of scene.monsters) {
    dashTrail(ctx, vis, m, time);
    if (!m.dead && m.boss && m.st === 'windup' && m.pat === 'quake' && m.stT < 4 / FPS) cell(ctx, vis, 'lv_pha_dia', 4 - Math.max(1, Math.ceil(m.stT * FPS)), m.x, m.y, { scale: STOMP_K });   // đất rạn ngay trước cú dậm
  }
}
// Cuồng Lang Bạo Khiếu: sóng gầm (bản tròn của lv_ho_khi trong cảnh biến hình) bung từ MIỆNG sói (vùng trúng cũng tâm ở miệng), đè lên thân sói, liên tục suốt các nhịp; bắt đầu 0,25 s trước nhịp đầu
const ROAR_LEAD = 0.25;
const roarT = m => (!m.dead && m.boss && m.st === 'windup' && m.pat === 'rageHowl' && m.howlT ? m.stMax - m.stT - m.howlT + ROAR_LEAD : -1);
export const bossRoars = scene => scene.monsters.filter(m => roarT(m) >= 0).map(m => ({ x: m.howlX, y: m.howlY, f: roarT(m) * FPS, end: 1e9 }));
function roar(ctx, vis, m, time) {
  if (!m.boss || !get(vis, 'lv_ho_khi_tron')) return;
  const t = roarT(m); if (t >= 0) { m._roarAt = time; m._roarT = t; }
  const out = t >= 0 ? 0 : (time - (m._roarAt ?? -9)) / 0.3; if (m._roarAt === undefined || out >= 1) return;
  const tt = m._roarT + (t >= 0 ? 0 : time - m._roarAt), f = Math.floor(tt * FPS) % 12;
  ctx.save();
  if (tt < 9 / FPS) { ctx.beginPath(); ctx.arc(m.howlX, m.howlY, 8 + 112 * (1 - (1 - tt * FPS / 9) ** 2.2), 0, 6.283); ctx.clip(); }   // đợt đầu mới bung: chưa có sóng ở xa
  if (out > 0) { ctx.beginPath(); ctx.arc(m.howlX, m.howlY, 130, 0, 6.283); ctx.arc(m.howlX, m.howlY, 110 * out, 0, 6.283, true); ctx.clip(); ctx.globalAlpha = 1 - out; }   // dứt tiếng: sóng trôi ra rồi tan
  cell(ctx, vis, 'lv_ho_khi_tron', f, m.howlX, m.howlY, { light: 0.8 * (1 - out) }); ctx.restore();
}
// Vệt lao của sói (pha 1: gió trắng xám, pha 2: máu), dừng lao thì tan 8 khung
function dashTrail(ctx, vis, m, time) {
  if (!m.boss || m.bossKind !== 'MINI' || m.dead || m.ult) return;
  if (m.st === 'dash') { if (!m._tr || m._tr.end !== undefined) m._tr = { x: m.x, y: m.y, a: Math.atan2(m.dirY, m.dirX) }; m._tr.far = Math.hypot(m.x - m._tr.x, m.y - m._tr.y); }
  else if (m._tr && m._tr.end === undefined) m._tr.end = time;
  const sn = m.p2 ? 'lv_huyet_anh' : 'lv_gio_lao', tr = m._tr, fx = tr && get(vis, sn); if (!fx || tr.far < 14) return;
  const f = tr.end === undefined ? 5 : 6 + Math.floor((time - tr.end) * FPS);
  if (f >= vis.FX[sn].meta.frames) return;
  const L = dashOf(m).SPEED * dashOf(m).TIME;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(tr.x), Math.round(tr.y) - 16); ctx.rotate(tr.a); ctx.scale(L / 244, 1.8);
  ctx.beginPath(); ctx.rect(-8, -30, Math.max(0, tr.far - (tr.end === undefined ? 10 : 0)) * 244 / L, 60); ctx.clip();
  fx.frame = f; fx.x = 0; fx.y = 0; fx.scale = 1; fx.flip = false; fx.lightGain = 0.35; fx.draw(ctx); ctx.restore();
}
// (26/11) Lang Hú / Hú Rồi Lao: tiếng hú gọi bầy — sóng khí gần kín màn (sheet ×2), KHÔNG sát thương. Từ lúc ngẩng đầu tới HOWL_TAIL giây sau khi gọi xong.
const HOWL_TAIL = 0.5;
function howlT(m, time) {   // giây từ lúc bắt đầu hú; -1 = không hú
  if (m.dead) return -1;
  if (m.st === 'windup' && (m.pat === 'howl' || m.pat === 'howlDash')) { const t = m.stMax * 0.62 - m.stT; if (t >= 0) { m._hwAt = time; m._hwT = t; m._hwX = m.x + (m.dirX < 0 ? -1 : 1) * 46; m._hwY = m.y - 52; } return t; }
  const e = time - (m._hwAt ?? -9); return m._hwAt !== undefined && e < HOWL_TAIL ? m._hwT + e : -1;
}
const howlEnd = (m, time) => Math.max(0, (time - m._hwAt) / HOWL_TAIL);   // 0 đang hú .. 1 tan hết
function howl(ctx, vis, m, time) {
  const t = howlT(m, time); if (t < 0 || m._hwX === undefined) return;
  const x = m._hwX, y = m._hwY, out = howlEnd(m, time), r = 1.02 * (16 + 324 * (1 - (1 - Math.min(1, t * FPS / 12)) ** 2.2));
  ctx.save();
  if (t * FPS < 12) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, 6.283); ctx.clip(); }                         // đợt đầu mới bung
  else if (out > 0) { ctx.beginPath(); ctx.ellipse(x, y, 420, 320, 0, 0, 6.283); ctx.ellipse(x, y, 340 * out, 255 * out, 0, 0, 6.283, true); ctx.clip(); }   // dứt tiếng: sóng trôi ra ngoài
  ctx.globalAlpha = 0.85 * (1 - out); cell(ctx, vis, 'lv_ho_khi_1', Math.floor(t * FPS) % 12, x, y, { scale: 2, light: 0.55 * (1 - out) }); ctx.restore();
}
// không khí méo theo tiếng hú (render.js gọi sau khi vẽ xong cảnh)
export const bossHowls = (scene, time) => scene.monsters.filter(m => m.boss && m._hwX !== undefined && howlT(m, time) >= 0 && howlEnd(m, time) < 0.6).map(m => ({ x: m._hwX, y: m._hwY, f: howlT(m, time) * FPS }));
export function bossFxObjs(vis, scene, time) {
  const out = [];
  for (const m of scene.monsters) if (m.boss && m.bossKind === 'MINI' && !m.ult && get(vis, 'lv_ho_khi_1') && howlT(m, time) >= 0) out.push({ y: 1e9, draw: ctx => howl(ctx, vis, m, time) });   // đè lên mọi vật
  for (const m of scene.monsters) if (m.boss && !m.dead && m.st === 'windup') {
    const k = 1 - Math.max(0, m.stT) / (m.stMax || 1);
    if (m.pat === 'burst' && get(vis, 'yv_dan_no')) out.push({ y: m.y + 1, draw: ctx => cell(ctx, vis, 'yv_dan_no', Math.min(4, Math.floor(k * 5)), m.x, m.y - 46) });   // cầu tối tụ giữa hai tay
    else if (m.pat === 'summon' && m.sumSpots && get(vis, 'yv_trieu')) for (const [x, y] of m.sumSpots) out.push({ y: y + 2, draw: ctx => cell(ctx, vis, 'yv_trieu', Math.min(9, Math.floor(k * 10)), x, y) });
  } else if (m.boss && !m.dead && m.st === 'blink' && m.blinkSkill && get(vis, 'yv_phan_anh')) {   // Ảnh Độn: khói tụ dần ở chỗ sắp hiện ra
    const f = Math.min(9, Math.floor((1 - Math.max(0, m.stT) / (m.stMax || 1)) * 10)), x = m.blinkX, y = m.blinkY; out.push({ y: y + 2, draw: ctx => cell(ctx, vis, 'yv_phan_anh', f, x, y) });
  }
  for (const m of scene.monsters) if (m.boss && m.howlX !== undefined) out.push({ y: m.y + 1, draw: ctx => roar(ctx, vis, m, time) });
  for (const h of scene.hazards || []) { const d = BOSS_FX_DEF[h.src]; if (d && has(vis, d)) upright(vis, h, d, h.t, -1, out); }
  for (const q of vis.bossFx || []) {
    if (q.d) upright(vis, q.h, q.d, 0, q.age, out);
    else if (q.soi) { const { x, y } = q.soi, f = Math.floor(q.age * FPS); out.push({ y: y + 1, draw: ctx => cell(ctx, vis, 'lv_trieu_soi', f, x, y) }); }
    else if (q.out) { const { x, y } = q.out, f = 10 + Math.floor(q.age * FPS); out.push({ y: y + 1, draw: ctx => cell(ctx, vis, q.small ? 'yv_trieu' : 'yv_phan_anh', f, x, y) }); }
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
